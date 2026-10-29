-- Timeclock schema. Employees and managers only touch punches through the
-- RPCs below, so the server clock (not the phone) sets punch times and every
-- manager change lands in punch_edits.

create table public.settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Timeclock',
  timezone text not null default 'America/New_York',
  week_starts_on smallint not null default 0 check (week_starts_on between 0 and 6), -- 0 = Sunday
  overtime_hours numeric not null default 40
);
insert into public.settings default values;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'employee' check (role in ('employee', 'admin')),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.punches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  clock_in timestamptz not null,
  clock_out timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (clock_out is null or clock_out > clock_in)
);
create index punches_user_in on public.punches (user_id, clock_in desc);
create index punches_in on public.punches (clock_in);
-- One open shift per person.
create unique index punches_one_open on public.punches (user_id) where clock_out is null;

create table public.punch_edits (
  id bigint generated always as identity primary key,
  punch_id uuid not null,
  user_id uuid not null,
  editor_id uuid not null references public.profiles (id),
  action text not null check (action in ('add', 'edit', 'delete')),
  before jsonb,
  after jsonb,
  reason text not null default '',
  at timestamptz not null default now()
);
create index punch_edits_at on public.punch_edits (at desc);

-- Helpers ---------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active)
$$;

create function public.require_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Managers only' using errcode = '42501';
  end if;
end $$;

-- First person to sign up runs the place; everyone after waits for approval.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first boolean;
begin
  perform pg_advisory_xact_lock(7001);
  first := not exists (select 1 from profiles where role = 'admin');
  insert into profiles (id, email, full_name, role, active)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          case when first then 'admin' else 'employee' end, first);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS: read your own, managers read all; no direct writes. -----------------

alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.punches enable row level security;
alter table public.punch_edits enable row level security;

create policy settings_read on public.settings for select to authenticated using (true);
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy punches_read on public.punches for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy punch_edits_read on public.punch_edits for select to authenticated
  using (public.is_admin());

-- Employee RPCs ---------------------------------------------------------

create function public.clock_in(p_note text default '') returns public.punches
language plpgsql security definer set search_path = public as $$
declare r punches;
begin
  if not exists (select 1 from profiles where id = auth.uid() and active) then
    raise exception 'Your account is waiting for a manager to approve it' using errcode = '42501';
  end if;
  if exists (select 1 from punches where user_id = auth.uid() and clock_out is null) then
    raise exception 'You are already clocked in';
  end if;
  insert into punches (user_id, clock_in, note)
  values (auth.uid(), now(), coalesce(trim(p_note), ''))
  returning * into r;
  return r;
end $$;

create function public.clock_out(p_note text default '') returns public.punches
language plpgsql security definer set search_path = public as $$
declare r punches;
begin
  update punches
     set clock_out = now(), updated_at = now(),
         note = case when coalesce(trim(p_note), '') = '' then note
                     when note = '' then trim(p_note)
                     else note || ' / ' || trim(p_note) end
   where user_id = auth.uid() and clock_out is null
  returning * into r;
  if r.id is null then
    raise exception 'You are not clocked in';
  end if;
  return r;
end $$;

-- Manager RPCs. Times come in as wall-clock time in the business time zone.

create function public.admin_save_punch(
  p_id uuid, p_user uuid, p_in timestamp, p_out timestamp, p_note text, p_reason text
) returns public.punches
language plpgsql security definer set search_path = public as $$
declare tz text; old punches; r punches;
begin
  perform require_admin();
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Give a reason for the change';
  end if;
  select timezone into tz from settings;
  if p_id is null then
    insert into punches (user_id, clock_in, clock_out, note)
    values (p_user, p_in at time zone tz, p_out at time zone tz, coalesce(trim(p_note), ''))
    returning * into r;
    insert into punch_edits (punch_id, user_id, editor_id, action, after, reason)
    values (r.id, r.user_id, auth.uid(), 'add', to_jsonb(r), trim(p_reason));
  else
    select * into old from punches where id = p_id for update;
    if old.id is null then raise exception 'Punch not found'; end if;
    update punches
       set clock_in = p_in at time zone tz, clock_out = p_out at time zone tz,
           note = coalesce(trim(p_note), ''), updated_at = now()
     where id = p_id
    returning * into r;
    insert into punch_edits (punch_id, user_id, editor_id, action, before, after, reason)
    values (r.id, r.user_id, auth.uid(), 'edit', to_jsonb(old), to_jsonb(r), trim(p_reason));
  end if;
  return r;
end $$;

create function public.admin_delete_punch(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare old punches;
begin
  perform require_admin();
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Give a reason for the change';
  end if;
  delete from punches where id = p_id returning * into old;
  if old.id is null then raise exception 'Punch not found'; end if;
  insert into punch_edits (punch_id, user_id, editor_id, action, before, reason)
  values (old.id, old.user_id, auth.uid(), 'delete', to_jsonb(old), trim(p_reason));
end $$;

create function public.admin_set_employee(p_user uuid, p_name text, p_role text, p_active boolean)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare r profiles;
begin
  perform require_admin();
  if p_user = auth.uid() and (p_role <> 'admin' or not p_active) then
    raise exception 'You cannot demote or deactivate yourself';
  end if;
  update profiles set full_name = trim(p_name), role = p_role, active = p_active
   where id = p_user returning * into r;
  -- Deactivating someone closes any open shift so it doesn't run forever.
  if not p_active then
    update punches set clock_out = now(), updated_at = now()
     where user_id = p_user and clock_out is null;
  end if;
  return r;
end $$;

create function public.admin_update_settings(
  p_business_name text, p_timezone text, p_week_starts_on smallint, p_overtime_hours numeric
) returns public.settings
language plpgsql security definer set search_path = public as $$
declare r settings;
begin
  perform require_admin();
  perform now() at time zone p_timezone; -- rejects an unknown zone
  update settings set business_name = trim(p_business_name), timezone = p_timezone,
         week_starts_on = p_week_starts_on, overtime_hours = p_overtime_hours
  returning * into r;
  return r;
end $$;

-- Seconds worked per person per day (by clock-in day, business time zone).
-- Runs as the caller, so RLS keeps employees to their own rows.
create function public.timesheet(p_from date, p_to date)
returns table (user_id uuid, full_name text, email text, work_date date, seconds bigint)
language sql stable security invoker set search_path = public as $$
  select p.user_id, pr.full_name, pr.email,
         (p.clock_in at time zone s.timezone)::date,
         sum(extract(epoch from coalesce(p.clock_out, now()) - p.clock_in))::bigint
    from punches p
    join profiles pr on pr.id = p.user_id
   cross join settings s
   where (p.clock_in at time zone s.timezone)::date between p_from and p_to
   group by 1, 2, 3, 4
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin, public.clock_in, public.clock_out,
  public.admin_save_punch, public.admin_delete_punch, public.admin_set_employee,
  public.admin_update_settings, public.timesheet to authenticated;
revoke execute on function public.require_admin, public.handle_new_user from authenticated;

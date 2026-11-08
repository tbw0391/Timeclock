-- Time-off requests: staff ask for days off from their phone; a manager
-- approves or declines, with an optional note back. Staff can cancel their own
-- request until the first day off has passed.

create table public.time_off (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  kind text not null default 'vacation' check (kind in ('vacation', 'sick', 'personal', 'other')),
  note text not null default '' check (length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text not null default '' check (length(decision_note) <= 500),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index time_off_dates on public.time_off (starts_on, ends_on);
alter table public.time_off enable row level security;
create policy time_off_read on public.time_off for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create function public.request_time_off(p_start date, p_end date, p_kind text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare today date := (select (now() at time zone timezone)::date from settings);
begin
  if not exists (select 1 from profiles where id = auth.uid() and active) then
    raise exception 'Your account is not active' using errcode = '42501';
  end if;
  if p_start is null or p_end is null or p_end < p_start then raise exception 'The last day has to be on or after the first day'; end if;
  -- A sick day can be put in afterwards, but not long afterwards.
  if p_start < today - 30 then raise exception 'That is too far in the past'; end if;
  if p_end - p_start > 60 then raise exception 'Please ask for 60 days or fewer at a time'; end if;
  if length(coalesce(trim(p_note), '')) > 500 then raise exception 'Please keep it shorter'; end if;
  insert into time_off (user_id, starts_on, ends_on, kind, note)
  values (auth.uid(), p_start, p_end, case when p_kind in ('vacation', 'sick', 'personal', 'other') then p_kind else 'other' end, coalesce(trim(p_note), ''));
end $$;

create function public.cancel_time_off(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare today date := (select (now() at time zone timezone)::date from settings);
begin
  update time_off set status = 'cancelled'
   where id = p_id and user_id = auth.uid() and status in ('pending', 'approved') and starts_on >= today;
  if not found then raise exception 'That request can no longer be cancelled'; end if;
end $$;

create function public.admin_decide_time_off(p_id bigint, p_status text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_status not in ('approved', 'declined') then raise exception 'Unknown status'; end if;
  if length(coalesce(trim(p_note), '')) > 500 then raise exception 'Please keep it shorter'; end if;
  update time_off set status = p_status, decided_by = auth.uid(), decided_at = now(), decision_note = coalesce(trim(p_note), '')
   where id = p_id and status <> 'cancelled';
end $$;

revoke execute on function public.request_time_off, public.cancel_time_off, public.admin_decide_time_off from public, anon, authenticated;
grant execute on function public.request_time_off, public.cancel_time_off, public.admin_decide_time_off to authenticated;

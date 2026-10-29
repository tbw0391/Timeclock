-- Sign-in is phone number + PIN; nobody uses email. Supabase Auth still keys
-- accounts by email, so the app logs in as <10 digits>@phone.timeclock.app and
-- passes the real number in user metadata. No mail is ever sent to it.

alter table public.profiles add column phone text unique;
alter table public.settings add column manager_phone text;

-- The manager is whoever signs up with settings.manager_phone. Only when that
-- is empty does the first sign-up take charge, as before.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare mgr text; phone text; boss boolean;
begin
  perform pg_advisory_xact_lock(7001);
  select manager_phone into mgr from settings;
  phone := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), '');
  boss := case when mgr is not null then phone = mgr
               else not exists (select 1 from profiles where role = 'admin') end;
  insert into profiles (id, email, phone, full_name, role, active)
  values (new.id, new.email, phone, coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          case when boss then 'admin' else 'employee' end, coalesce(boss, false));
  return new;
end $$;

-- No email means no reset link, so managers set a new PIN for people.
create function public.admin_reset_pin(p_user uuid, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_pin !~ '^\d{6,}$' then
    raise exception 'PIN must be at least 6 digits';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_pin, extensions.gen_salt('bf')), updated_at = now()
   where id = p_user;
  if not found then raise exception 'Person not found'; end if;
end $$;

drop function public.timesheet(date, date);
create function public.timesheet(p_from date, p_to date)
returns table (user_id uuid, full_name text, phone text, work_date date, seconds bigint)
language sql stable security invoker set search_path = public as $$
  select p.user_id, pr.full_name, pr.phone,
         (p.clock_in at time zone s.timezone)::date,
         sum(extract(epoch from coalesce(p.clock_out, now()) - p.clock_in))::bigint
    from punches p
    join profiles pr on pr.id = p.user_id
   cross join settings s
   where (p.clock_in at time zone s.timezone)::date between p_from and p_to
   group by 1, 2, 3, 4
$$;

revoke execute on function public.admin_reset_pin, public.timesheet from public, anon;
grant execute on function public.admin_reset_pin, public.timesheet to authenticated;

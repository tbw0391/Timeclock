-- Sign-in is phone number + PIN; nobody uses email. Supabase Auth still keys
-- accounts by email, so each number logs in as <10 digits>@phone.timeclock.app,
-- an address that never receives mail.
--
-- The manager (settings.manager_phone) signs up once on the login page; every
-- other account is created by a manager with admin_create_employee.

alter table public.profiles add column phone text unique;
alter table public.settings add column manager_phone text;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare mgr text; phone text; boss boolean;
begin
  perform pg_advisory_xact_lock(7001);
  select manager_phone into mgr from settings;
  phone := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), '');
  if coalesce((new.raw_app_meta_data ->> 'created_by_manager')::boolean, false) then
    boss := false;
  elsif mgr is not null and phone = mgr then
    boss := true;
  elsif mgr is null and not exists (select 1 from profiles where role = 'admin') then
    boss := true;
  else
    raise exception 'Accounts are created by the manager';
  end if;
  insert into profiles (id, email, phone, full_name, role, active)
  values (new.id, new.email, phone, coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          case when boss then 'admin' else 'employee' end, true);
  return new;
end $$;

create function public.check_pin(p_pin text) returns void
language plpgsql immutable as $$
begin
  if p_pin is null or p_pin !~ '^\d{6,}$' then
    raise exception 'PIN must be at least 6 digits';
  end if;
end $$;

create function public.admin_create_employee(p_name text, p_phone text, p_pin text)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare uid uuid := gen_random_uuid(); phone text; mail text; r profiles;
begin
  perform require_admin();
  perform check_pin(p_pin);
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter a name'; end if;
  phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(phone) = 11 and phone like '1%' then phone := substr(phone, 2); end if;
  if phone !~ '^\d{10}$' then raise exception 'Enter a 10-digit phone number'; end if;
  if exists (select 1 from profiles where profiles.phone = admin_create_employee.phone) then
    raise exception 'That phone number already has an account';
  end if;
  mail := phone || '@phone.timeclock.app';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
    extensions.crypt(p_pin, extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'created_by_manager', true),
    jsonb_build_object('full_name', trim(p_name), 'phone', phone), now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true),
          'email', now(), now());

  select * into r from profiles where id = uid;
  return r;
end $$;

-- No email means no reset link, so managers set a new PIN for people.
create function public.admin_reset_pin(p_user uuid, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  perform check_pin(p_pin);
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

revoke execute on function public.check_pin, public.admin_create_employee, public.admin_reset_pin,
  public.timesheet from public, anon;
revoke execute on function public.check_pin from authenticated;
grant execute on function public.admin_create_employee, public.admin_reset_pin, public.timesheet
  to authenticated;

-- settings.manager_phone is set directly in the database, not in this file.
update public.settings set manager_phone = '6145988991';

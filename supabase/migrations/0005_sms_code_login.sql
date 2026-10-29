-- Sign-in is now a one-time code texted to the phone (Supabase phone auth).
-- PINs and the @phone.timeclock.app stand-in addresses are gone.
--
-- auth.users.phone holds the number as 1 + 10 digits; profiles.phone keeps the
-- bare 10. The app asks Supabase to create the account on first code request, and
-- the trigger below only allows that for the manager's number or a number a
-- manager already added, so a stranger's number never gets an account or a text.

alter table public.profiles alter column email drop not null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare mgr text; v_phone text; boss boolean;
begin
  perform pg_advisory_xact_lock(7001);
  select manager_phone into mgr from settings;
  v_phone := regexp_replace(coalesce(nullif(new.phone, ''), new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g');
  if length(v_phone) = 11 and v_phone like '1%' then v_phone := substr(v_phone, 2); end if;
  v_phone := nullif(v_phone, '');
  if coalesce((new.raw_app_meta_data ->> 'created_by_manager')::boolean, false) then
    boss := false;
  elsif mgr is not null and v_phone = mgr then
    boss := true;
  elsif mgr is null and not exists (select 1 from profiles where role = 'admin') then
    boss := true;
  else
    raise exception 'That phone number is not set up';
  end if;
  insert into profiles (id, email, phone, full_name, role, active)
  values (new.id, new.email, v_phone, coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          case when boss then 'admin' else 'employee' end, true);
  return new;
end $$;

drop function public.admin_reset_pin(uuid, text);
drop function public.admin_create_employee(text, text, text);
drop function public.check_pin(text);

-- The person signs in later by asking for a code; verifying it confirms the phone.
create function public.admin_create_employee(p_name text, p_phone text)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare uid uuid := gen_random_uuid(); v_phone text; r profiles;
begin
  perform require_admin();
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter a name'; end if;
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_phone) = 11 and v_phone like '1%' then v_phone := substr(v_phone, 2); end if;
  if v_phone !~ '^\d{10}$' then raise exception 'Enter a 10-digit phone number'; end if;
  if exists (select 1 from profiles where phone = v_phone) then
    raise exception 'That phone number already has an account';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, phone,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', '1' || v_phone,
    jsonb_build_object('provider', 'phone', 'providers', jsonb_build_array('phone'), 'created_by_manager', true),
    jsonb_build_object('full_name', trim(p_name), 'phone', v_phone), now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (uid::text, uid, jsonb_build_object('sub', uid::text, 'phone', '1' || v_phone, 'phone_verified', false),
          'phone', now(), now());

  select * into r from profiles where id = uid;
  return r;
end $$;

revoke execute on function public.admin_create_employee from public, anon;
grant execute on function public.admin_create_employee to authenticated;

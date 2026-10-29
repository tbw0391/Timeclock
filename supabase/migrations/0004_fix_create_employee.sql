-- 0003 shipped admin_create_employee with a variable that shadowed profiles.phone.
create or replace function public.admin_create_employee(p_name text, p_phone text, p_pin text)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare uid uuid := gen_random_uuid(); v_phone text; mail text; r profiles;
begin
  perform require_admin();
  perform check_pin(p_pin);
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter a name'; end if;
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_phone) = 11 and v_phone like '1%' then v_phone := substr(v_phone, 2); end if;
  if v_phone !~ '^\d{10}$' then raise exception 'Enter a 10-digit phone number'; end if;
  if exists (select 1 from profiles where phone = v_phone) then
    raise exception 'That phone number already has an account';
  end if;
  mail := v_phone || '@phone.timeclock.app';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
    extensions.crypt(p_pin, extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'created_by_manager', true),
    jsonb_build_object('full_name', trim(p_name), 'phone', v_phone), now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true),
          'email', now(), now());

  select * into r from profiles where id = uid;
  return r;
end $$;

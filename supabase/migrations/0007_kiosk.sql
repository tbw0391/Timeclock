-- Kiosk mode: a shared tablet where staff tap their name and enter a 4-digit
-- kiosk PIN to clock in or out.
--
-- The tablet holds no Supabase session. A manager turns a device into a kiosk,
-- which stores a random token in an httpOnly cookie on that device; only its
-- sha256 is kept here. The kiosk_* functions are callable without signing in
-- but do nothing without a valid token. Removing the kiosk row retires it.
--
-- Kiosk PINs only work at a kiosk; phones still sign in with a texted code.
-- PIN checks return a result instead of raising, so the failed-attempt counter
-- isn't rolled back: five misses lock that person's PIN for 15 minutes.

create table public.kiosks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.kiosks enable row level security;
create policy kiosks_read on public.kiosks for select to authenticated using (public.is_admin());

create table public.kiosk_pins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pin_hash text not null,
  failed smallint not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.kiosk_pins enable row level security; -- no policies: functions only

-- Which kiosk a punch came from (its name at the time).
alter table public.punches add column in_kiosk text, add column out_kiosk text;

create function public.kiosk_from_token(p_token text) returns public.kiosks
language sql stable security definer set search_path = public as $$
  select * from kiosks where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

-- null when the PIN is right; otherwise the message to show.
create function public.check_kiosk_pin(p_user uuid, p_pin text) returns text
language plpgsql security definer set search_path = public as $$
declare kp kiosk_pins;
begin
  select * into kp from kiosk_pins where user_id = p_user for update;
  if kp.user_id is null then return 'No kiosk PIN set yet. Set one on your Account page or ask a manager.'; end if;
  if kp.locked_until > now() then
    return format('Too many wrong PINs. Try again in %s minute(s).', ceil(extract(epoch from kp.locked_until - now()) / 60));
  end if;
  if p_pin is null or kp.pin_hash <> extensions.crypt(p_pin, kp.pin_hash) then
    update kiosk_pins set failed = failed + 1,
           locked_until = case when failed + 1 >= 5 then now() + interval '15 minutes' end
     where user_id = p_user;
    return case when kp.failed + 1 >= 5 then 'Too many wrong PINs. Locked for 15 minutes.' else 'Wrong PIN. Try again.' end;
  end if;
  update kiosk_pins set failed = 0, locked_until = null where user_id = p_user;
  return null;
end $$;

create function public.kiosk_roster(p_token text)
returns table (id uuid, name text, on_clock boolean, has_pin boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if (kiosk_from_token(p_token)).id is null then raise exception 'This device is no longer a kiosk' using errcode = '42501'; end if;
  return query
    select pr.id,
           coalesce(nullif(pr.full_name, ''), 'Phone ending ' || right(pr.phone, 4)),
           exists (select 1 from punches p where p.user_id = pr.id and p.clock_out is null),
           exists (select 1 from kiosk_pins k where k.user_id = pr.id)
      from profiles pr
     where pr.active
     order by 2;
end $$;

-- Clocks the person in, or out if they're on the clock.
create function public.kiosk_punch(
  p_token text, p_user uuid, p_pin text,
  p_lat double precision default null, p_lng double precision default null,
  p_accuracy double precision default null, p_gps text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kiosks; pr profiles; err text; g record; r punches;
begin
  k := kiosk_from_token(p_token);
  if k.id is null then return jsonb_build_object('ok', false, 'error', 'This device is no longer a kiosk.'); end if;
  select * into pr from profiles where id = p_user and active;
  if pr.id is null then return jsonb_build_object('ok', false, 'error', 'Person not found.'); end if;
  err := check_kiosk_pin(p_user, p_pin);
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;

  select * into g from clean_gps(p_lat, p_lng, p_accuracy, p_gps);
  update kiosks set last_used_at = now() where id = k.id;
  update punches
     set clock_out = now(), updated_at = now(), out_kiosk = k.name,
         out_lat = g.lat, out_lng = g.lng, out_accuracy_m = g.accuracy, out_gps = g.gps
   where user_id = p_user and clock_out is null
  returning * into r;
  if r.id is not null then
    return jsonb_build_object('ok', true, 'action', 'out', 'at', r.clock_out, 'clock_in', r.clock_in);
  end if;
  insert into punches (user_id, clock_in, in_kiosk, in_lat, in_lng, in_accuracy_m, in_gps)
  values (p_user, now(), k.name, g.lat, g.lng, g.accuracy, g.gps)
  returning * into r;
  return jsonb_build_object('ok', true, 'action', 'in', 'at', r.clock_in);
end $$;

-- A manager's name + PIN turns the device back into a normal browser.
create function public.kiosk_exit(p_token text, p_user uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kiosks; err text;
begin
  k := kiosk_from_token(p_token);
  if k.id is null then return jsonb_build_object('ok', true); end if;
  if not exists (select 1 from profiles where id = p_user and role = 'admin' and active) then
    return jsonb_build_object('ok', false, 'error', 'Only a manager can exit kiosk mode.');
  end if;
  err := check_kiosk_pin(p_user, p_pin);
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  delete from kiosks where id = k.id;
  return jsonb_build_object('ok', true);
end $$;

create function public.admin_create_kiosk(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  perform require_admin();
  if coalesce(trim(p_name), '') = '' then raise exception 'Give the kiosk a name, like Front desk'; end if;
  insert into kiosks (name, token_hash, created_by)
  values (trim(p_name), encode(extensions.digest(token, 'sha256'), 'hex'), auth.uid());
  return token;
end $$;

create function public.admin_delete_kiosk(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  delete from kiosks where id = p_id;
end $$;

create function public.admin_set_kiosk_pin(p_user uuid, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_pin is null or p_pin !~ '^\d{4}$' then raise exception 'Kiosk PIN must be 4 digits'; end if;
  insert into kiosk_pins (user_id, pin_hash) values (p_user, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, failed = 0, locked_until = null, updated_at = now();
end $$;

create function public.set_my_kiosk_pin(p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and active) then
    raise exception 'Your account is not active' using errcode = '42501';
  end if;
  if p_pin is null or p_pin !~ '^\d{4}$' then raise exception 'Kiosk PIN must be 4 digits'; end if;
  insert into kiosk_pins (user_id, pin_hash) values (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, failed = 0, locked_until = null, updated_at = now();
end $$;

create function public.my_kiosk_pin_set() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from kiosk_pins where user_id = auth.uid())
$$;

create function public.admin_kiosk_pin_users() returns setof uuid
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin();
  return query select user_id from kiosk_pins;
end $$;

revoke execute on function public.kiosk_from_token, public.check_kiosk_pin, public.kiosk_roster,
  public.kiosk_punch, public.kiosk_exit, public.admin_create_kiosk, public.admin_delete_kiosk,
  public.admin_set_kiosk_pin, public.set_my_kiosk_pin, public.my_kiosk_pin_set,
  public.admin_kiosk_pin_users from public, anon, authenticated;
grant execute on function public.kiosk_roster, public.kiosk_punch, public.kiosk_exit to anon, authenticated;
grant execute on function public.admin_create_kiosk, public.admin_delete_kiosk, public.admin_set_kiosk_pin,
  public.set_my_kiosk_pin, public.my_kiosk_pin_set, public.admin_kiosk_pin_users to authenticated;

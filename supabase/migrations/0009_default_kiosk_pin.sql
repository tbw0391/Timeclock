-- Kiosk PIN defaults to the last 4 digits of the person's phone number: for
-- every new account (added by a manager or the manager's own first sign-in) and
-- for anyone who has no kiosk PIN yet. People can change theirs on the Account
-- page; managers can reset it on Crew.

create function public.default_kiosk_pin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.phone ~ '^\d{10}$' then
    insert into kiosk_pins (user_id, pin_hash)
    values (new.id, extensions.crypt(right(new.phone, 4), extensions.gen_salt('bf')))
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

create trigger on_profile_created_kiosk_pin after insert on public.profiles
for each row execute function public.default_kiosk_pin();

revoke execute on function public.default_kiosk_pin from public, anon, authenticated;

insert into public.kiosk_pins (user_id, pin_hash)
select id, extensions.crypt(right(phone, 4), extensions.gen_salt('bf'))
  from public.profiles
 where phone ~ '^\d{10}$'
on conflict (user_id) do nothing;

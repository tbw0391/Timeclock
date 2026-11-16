-- Volunteers clock in like staff, but they're unpaid: no overtime, and they're
-- left out of the Gusto and QuickBooks hours. Their hours are totalled on
-- Timesheets so the center can report volunteer time.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('employee', 'volunteer', 'admin'));

-- QuickBooks Online (off until turned on; see README): a manager connects the
-- business's QuickBooks, then each finished punch goes across as a timesheet
-- entry (TimeActivity) under a matching QuickBooks employee, so QuickBooks
-- Payroll can pay from it. Ported from the estimator app's time-card sync.
-- Only punches that start on or after sync_from go, so hours already entered
-- by hand aren't doubled. The edge function `quickbooks` (service role) does
-- all the reading and writing here.

create table public.qbo_connection (
  id boolean primary key default true check (id),
  state text unique,                     -- OAuth state while connecting
  return_to text not null default '',    -- the staff app to come back to
  realm_id text,
  qbo_company_name text not null default '',
  access_token text,
  refresh_token text,
  access_expires_at timestamptz,
  refresh_expires_at timestamptz,
  sync_from date not null default current_date,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text not null default ''
);
alter table public.qbo_connection enable row level security;
-- No policies: only the service role reads or writes this table.
revoke all on public.qbo_connection from anon, authenticated;

-- What each punch is in QuickBooks, when it was last sent, and why it failed.
-- Every punch change already sets updated_at, so "changed since last sync" is
-- updated_at > qbo_synced_at.
alter table public.punches
  add column qbo_id text, add column qbo_synced_at timestamptz, add column qbo_error text not null default '';
alter table public.profiles add column qbo_employee_id text;

-- A deleted punch that was already sent is deleted from QuickBooks on the next sync.
create table public.qbo_deleted (
  qbo_id text primary key,
  deleted_at timestamptz not null default now()
);
alter table public.qbo_deleted enable row level security;
revoke all on public.qbo_deleted from anon, authenticated;

create function public.qbo_note_deleted_punch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.qbo_id is not null then
    insert into qbo_deleted (qbo_id) values (old.qbo_id) on conflict do nothing;
  end if;
  return old;
end $$;
revoke execute on function public.qbo_note_deleted_punch from public, anon, authenticated;
create trigger punches_qbo_deleted after delete on public.punches
for each row execute function public.qbo_note_deleted_punch();

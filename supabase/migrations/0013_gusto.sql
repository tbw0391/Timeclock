-- Gusto (off until turned on; see README): a manager connects the business's
-- Gusto account, matches each person to their Gusto employee, and each
-- finished punch goes to Gusto's Time Tracking API as a time sheet, split into
-- regular and overtime hours by the week. Hours wait in Gusto until the admin
-- syncs them to payroll there. Only punches that start on or after sync_from
-- go. The edge function `gusto` (service role) does all the reading and
-- writing here.

create table public.gusto_connection (
  id boolean primary key default true check (id),
  state text unique,                     -- OAuth state while connecting
  return_to text not null default '',    -- the staff app to come back to
  company_uuid text,
  company_name text not null default '',
  access_token text,
  refresh_token text,
  access_expires_at timestamptz,
  sync_from date not null default current_date,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text not null default ''
);
alter table public.gusto_connection enable row level security;
-- No policies: only the service role reads or writes this table.
revoke all on public.gusto_connection from anon, authenticated;

-- Which Gusto employee (and their primary job) each person is.
alter table public.profiles add column gusto_employee_uuid text, add column gusto_job_uuid text;

-- What each punch is in Gusto. gusto_sent is what was last sent (times, hours
-- split, employee), so a punch goes again when it changes or when an edit
-- earlier in the week moves its overtime.
alter table public.punches
  add column gusto_id text, add column gusto_version text, add column gusto_sent text,
  add column gusto_synced_at timestamptz, add column gusto_error text not null default '';

-- A deleted punch that was already sent is deleted from Gusto on the next sync.
create table public.gusto_deleted (
  gusto_id text primary key,
  version text not null,
  deleted_at timestamptz not null default now()
);
alter table public.gusto_deleted enable row level security;
revoke all on public.gusto_deleted from anon, authenticated;

create function public.gusto_note_deleted_punch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.gusto_id is not null then
    insert into gusto_deleted (gusto_id, version) values (old.gusto_id, coalesce(old.gusto_version, '')) on conflict do nothing;
  end if;
  return old;
end $$;
revoke execute on function public.gusto_note_deleted_punch from public, anon, authenticated;
create trigger punches_gusto_deleted after delete on public.punches
for each row execute function public.gusto_note_deleted_punch();

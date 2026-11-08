-- Announcements: a manager posts a note every active staff member sees at the
-- top of the hub until they tap "Got it" (and managers can see who has).
-- An optional last day takes it down by itself.
--
-- Certifications: each person's CPR, first aid, background check and so on,
-- with expiry dates, so managers see what's running out and staff see their own.

create table public.announcements (
  id bigint generated always as identity primary key,
  body text not null check (length(body) between 1 and 2000),
  until date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index announcements_created on public.announcements (created_at desc);
alter table public.announcements enable row level security;
create policy announcements_read on public.announcements for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and active));

create table public.announcement_reads (
  announcement_id bigint not null references public.announcements (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);
alter table public.announcement_reads enable row level security;
create policy announcement_reads_read on public.announcement_reads for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create function public.admin_post_announcement(p_body text, p_until date default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if coalesce(trim(p_body), '') = '' then raise exception 'Write the announcement first'; end if;
  if length(trim(p_body)) > 2000 then raise exception 'Please keep it under 2000 characters'; end if;
  insert into announcements (body, until, created_by) values (trim(p_body), p_until, auth.uid());
end $$;

create function public.admin_delete_announcement(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  delete from announcements where id = p_id;
end $$;

create function public.read_announcement(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and active) then
    raise exception 'Your account is not active' using errcode = '42501';
  end if;
  insert into announcement_reads (announcement_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
end $$;

create table public.certifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (length(kind) between 1 and 80),
  expires_on date,                       -- null: doesn't expire
  note text not null default '' check (length(note) <= 200),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
create index certifications_user on public.certifications (user_id);
alter table public.certifications enable row level security;
create policy certifications_read on public.certifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Adds one (p_id null) or changes one.
create function public.admin_set_certification(p_id bigint, p_user uuid, p_kind text, p_expires date, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if coalesce(trim(p_kind), '') = '' then raise exception 'Say what the certification is'; end if;
  if length(trim(p_kind)) > 80 or length(coalesce(trim(p_note), '')) > 200 then raise exception 'Please keep it shorter'; end if;
  if p_id is null then
    insert into certifications (user_id, kind, expires_on, note, updated_by)
    values (p_user, trim(p_kind), p_expires, coalesce(trim(p_note), ''), auth.uid());
  else
    update certifications set kind = trim(p_kind), expires_on = p_expires, note = coalesce(trim(p_note), ''),
      updated_at = now(), updated_by = auth.uid()
     where id = p_id;
  end if;
end $$;

create function public.admin_delete_certification(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  delete from certifications where id = p_id;
end $$;

revoke execute on function public.admin_post_announcement, public.admin_delete_announcement, public.read_announcement,
  public.admin_set_certification, public.admin_delete_certification from public, anon, authenticated;
grant execute on function public.admin_post_announcement, public.admin_delete_announcement, public.read_announcement,
  public.admin_set_certification, public.admin_delete_certification to authenticated;

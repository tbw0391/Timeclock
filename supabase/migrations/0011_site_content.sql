-- Website content managers edit from the staff app, one row per piece (the
-- top banner first; page text and photos later). Anyone, signed in or not,
-- can read it because the public website shows it. Writes go through the
-- admin_set_* functions.

create table public.site_content (
  key text primary key check (key in ('notice')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
alter table public.site_content enable row level security;
create policy site_content_read on public.site_content for select to anon, authenticated using (true);

-- The banner across the top of the website: {"text": "...", "until": "YYYY-MM-DD" or null}.
-- It hides itself after the "until" day ends in the business time zone.
insert into public.site_content (key, value)
values ('notice', '{"text": "No school on November 3rd.", "until": "2026-11-03"}');

create function public.admin_set_notice(p_text text, p_until date default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if length(coalesce(trim(p_text), '')) > 200 then raise exception 'Please keep the banner under 200 characters'; end if;
  insert into site_content (key, value, updated_at, updated_by)
  values ('notice', jsonb_build_object('text', coalesce(trim(p_text), ''), 'until', p_until), now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;

-- What the website shows right now: the banner text, or null when it is
-- empty or past its "until" day.
create function public.site_notice() returns text
language sql stable security definer set search_path = public as $$
  select nullif(c.value ->> 'text', '')
    from site_content c, settings s
   where c.key = 'notice'
     and (c.value ->> 'until' is null or (c.value ->> 'until')::date >= (now() at time zone s.timezone)::date)
$$;

revoke execute on function public.admin_set_notice, public.site_notice from public, anon, authenticated;
grant execute on function public.admin_set_notice to authenticated;
grant execute on function public.site_notice to anon, authenticated;

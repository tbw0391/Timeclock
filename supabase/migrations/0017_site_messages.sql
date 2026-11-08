-- Messages sent from the contact form on the public website (replacing the Wix
-- forms). Anyone can send one, signed in or not; only managers read them.
-- lang is the language the site was being read in, so a manager knows to
-- reply in it.

create table public.site_messages (
  id bigint generated always as identity primary key,
  name text not null check (length(name) between 1 and 100),
  reply_to text not null check (length(reply_to) between 1 and 200),
  body text not null check (length(body) between 1 and 3000),
  lang text not null default 'en' check (lang in ('en', 'fa', 'prs', 'ps', 'ar')),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index site_messages_created on public.site_messages (created_at desc);
alter table public.site_messages enable row level security;
create policy site_messages_read on public.site_messages for select to authenticated using (public.is_admin());

-- The app also turns away bots (a hidden field and a minimum time on the
-- page); this caps the flood if one gets past that.
create function public.site_send_message(p_name text, p_reply_to text, p_body text, p_lang text default 'en') returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_reply_to), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'Please fill in every box';
  end if;
  if length(trim(p_name)) > 100 or length(trim(p_reply_to)) > 200 or length(trim(p_body)) > 3000 then
    raise exception 'Please keep your message under 3000 characters';
  end if;
  if (select count(*) from site_messages where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many messages right now. Please call or email instead.';
  end if;
  insert into site_messages (name, reply_to, body, lang)
  values (trim(p_name), trim(p_reply_to), trim(p_body), case when p_lang in ('fa', 'prs', 'ps', 'ar') then p_lang else 'en' end);
end $$;

create function public.admin_set_message_status(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_status not in ('new', 'done') then raise exception 'Unknown status'; end if;
  update site_messages set status = p_status where id = p_id;
end $$;

revoke execute on function public.site_send_message, public.admin_set_message_status from public, anon, authenticated;
grant execute on function public.site_send_message to anon, authenticated;
grant execute on function public.admin_set_message_status to authenticated;

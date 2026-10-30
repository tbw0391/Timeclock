-- Suggestion box: anyone signed in can send managers an idea, with their name
-- or anonymously. Anonymous suggestions store no user at all, so not even a
-- manager reading the database can tell who sent them.

create table public.suggestions (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  body text not null check (length(body) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index suggestions_created on public.suggestions (created_at desc);
alter table public.suggestions enable row level security;
create policy suggestions_read on public.suggestions for select to authenticated using (public.is_admin());

create function public.submit_suggestion(p_body text, p_anonymous boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and active) then
    raise exception 'Your account is not active' using errcode = '42501';
  end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Write your suggestion first'; end if;
  if length(trim(p_body)) > 2000 then raise exception 'Please keep it under 2000 characters'; end if;
  insert into suggestions (user_id, body)
  values (case when p_anonymous then null else auth.uid() end, trim(p_body));
end $$;

create function public.admin_set_suggestion_status(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_status not in ('new', 'done') then raise exception 'Unknown status'; end if;
  update suggestions set status = p_status where id = p_id;
end $$;

revoke execute on function public.submit_suggestion, public.admin_set_suggestion_status from public, anon, authenticated;
grant execute on function public.submit_suggestion, public.admin_set_suggestion_status to authenticated;

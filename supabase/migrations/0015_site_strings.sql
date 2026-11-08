-- Translations of the website, one row per English string and language. When
-- a manager saves English text, any string without a translation yet is sent
-- to Claude (lib/site/translate.ts) and stored here; changed English is a new
-- string, so it gets a fresh translation. A manager can correct a translation
-- (edited = true), and machine translations never overwrite a correction.

create table public.site_strings (
  lang text not null check (lang in ('fa', 'prs', 'ps', 'ar')),
  hash text not null,          -- md5 of en, so long paragraphs can be a key
  en text not null,
  tr text not null,
  edited boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (lang, hash)
);
alter table public.site_strings enable row level security;
create policy site_strings_read on public.site_strings for select to anon, authenticated using (true);

-- p_rows: [{"en": "...", "tr": "..."}]. p_edited: true when a manager typed them.
create function public.admin_set_site_strings(p_lang text, p_rows jsonb, p_edited boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_lang not in ('fa', 'prs', 'ps', 'ar') or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Unknown website section';
  end if;
  if jsonb_array_length(p_rows) > 1000 or octet_length(p_rows::text) > 500000 then
    raise exception 'That page is too long to save';
  end if;
  insert into site_strings as s (lang, hash, en, tr, edited, updated_at)
  select distinct on (md5(r ->> 'en')) p_lang, md5(r ->> 'en'), r ->> 'en', trim(r ->> 'tr'), p_edited, now()
    from jsonb_array_elements(p_rows) r
   where coalesce(r ->> 'en', '') <> '' and coalesce(trim(r ->> 'tr'), '') <> ''
  on conflict (lang, hash) do update set tr = excluded.tr, edited = excluded.edited, updated_at = now()
   where p_edited or not s.edited;
end $$;

revoke execute on function public.admin_set_site_strings from public, anon, authenticated;
grant execute on function public.admin_set_site_strings to authenticated;

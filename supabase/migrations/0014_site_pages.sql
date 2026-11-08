-- Page text and contact details edited from the staff app's Website page.
-- 'page:<slug>' holds an edited page as {"sections": [...]} (the same shape as
-- lib/site/content.ts); 'contact' holds the phone, email, address and office
-- hours. With no row the website shows what's in lib/site/content.ts.

alter table public.site_content drop constraint site_content_key_check;
alter table public.site_content add constraint site_content_key_check
  check (key in ('notice', 'contact') or key ~ '^page:[a-z0-9-]*$');

-- Saves one piece, or with a null value removes it so the original comes back.
-- The app checks the shape; this checks who is saving and the size.
create function public.admin_set_site_content(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_key = 'notice' or not (p_key = 'contact' or p_key ~ '^page:[a-z0-9-]*$') then
    raise exception 'Unknown website section';
  end if;
  if p_value is null then
    delete from site_content where key = p_key;
    return;
  end if;
  if jsonb_typeof(p_value) <> 'object' then raise exception 'Unknown website section'; end if;
  if octet_length(p_value::text) > 100000 then raise exception 'That page is too long to save'; end if;
  insert into site_content (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;

revoke execute on function public.admin_set_site_content from public, anon, authenticated;
grant execute on function public.admin_set_site_content to authenticated;

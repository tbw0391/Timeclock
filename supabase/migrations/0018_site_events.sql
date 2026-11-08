-- Upcoming events for the website's Upcoming Events page, edited on the
-- Website page: site_content 'events' = {"items": [{"date": "YYYY-MM-DD",
-- "title": "...", "details": "..."}]}. An event drops off the website after
-- its day ends in the business time zone.

alter table public.site_content drop constraint site_content_key_check;
alter table public.site_content add constraint site_content_key_check
  check (key in ('notice', 'contact', 'events') or key ~ '^page:[a-z0-9-]*$');

create or replace function public.admin_set_site_content(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_key = 'notice' or not (p_key in ('contact', 'events') or p_key ~ '^page:[a-z0-9-]*$') then
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

-- The events still to come (today included), soonest first.
create function public.site_events() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(e order by e ->> 'date', e ->> 'title'), '[]'::jsonb)
    from site_content c, settings s, jsonb_array_elements(c.value -> 'items') e
   where c.key = 'events'
     and (e ->> 'date') ~ '^\d{4}-\d{2}-\d{2}$'
     and (e ->> 'date')::date >= (now() at time zone s.timezone)::date
$$;

revoke execute on function public.site_events from public, anon, authenticated;
grant execute on function public.site_events to anon, authenticated;

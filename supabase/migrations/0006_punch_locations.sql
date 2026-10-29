-- GPS tag on each clock-in and clock-out, taken by the phone's browser when the
-- button is tapped. A punch never fails for lack of a location; *_gps records
-- why there isn't one so managers can follow up:
--   ok           lat/lng/accuracy are set
--   denied       the person blocked location for the site
--   unavailable  the phone couldn't get a fix (GPS off, indoors)
--   timeout      no fix in time
--   unsupported  the browser has no location support or didn't send any
-- null means the time wasn't punched by the person (a manager entered it, or it
-- was closed when they were deactivated).

alter table public.punches
  add column in_lat double precision,
  add column in_lng double precision,
  add column in_accuracy_m double precision,
  add column in_gps text check (in_gps in ('ok', 'denied', 'unavailable', 'timeout', 'unsupported')),
  add column out_lat double precision,
  add column out_lng double precision,
  add column out_accuracy_m double precision,
  add column out_gps text check (out_gps in ('ok', 'denied', 'unavailable', 'timeout', 'unsupported'));

-- Turns what the browser sent into a status plus coordinates we trust.
create function public.clean_gps(
  p_lat double precision, p_lng double precision, p_accuracy double precision, p_gps text,
  out gps text, out lat double precision, out lng double precision, out accuracy double precision
) language plpgsql immutable as $$
begin
  if p_lat between -90 and 90 and p_lng between -180 and 180 then
    gps := 'ok'; lat := p_lat; lng := p_lng;
    accuracy := case when p_accuracy >= 0 then round(p_accuracy::numeric, 1) end;
  else
    gps := case when p_gps in ('denied', 'unavailable', 'timeout') then p_gps else 'unsupported' end;
  end if;
end $$;

drop function public.clock_in(text);
create function public.clock_in(
  p_note text default '', p_lat double precision default null, p_lng double precision default null,
  p_accuracy double precision default null, p_gps text default null
) returns public.punches
language plpgsql security definer set search_path = public as $$
declare r punches; g record;
begin
  if not exists (select 1 from profiles where id = auth.uid() and active) then
    raise exception 'Your account is waiting for a manager to approve it' using errcode = '42501';
  end if;
  if exists (select 1 from punches where user_id = auth.uid() and clock_out is null) then
    raise exception 'You are already clocked in';
  end if;
  select * into g from clean_gps(p_lat, p_lng, p_accuracy, p_gps);
  insert into punches (user_id, clock_in, note, in_lat, in_lng, in_accuracy_m, in_gps)
  values (auth.uid(), now(), coalesce(trim(p_note), ''), g.lat, g.lng, g.accuracy, g.gps)
  returning * into r;
  return r;
end $$;

drop function public.clock_out(text);
create function public.clock_out(
  p_note text default '', p_lat double precision default null, p_lng double precision default null,
  p_accuracy double precision default null, p_gps text default null
) returns public.punches
language plpgsql security definer set search_path = public as $$
declare r punches; g record;
begin
  select * into g from clean_gps(p_lat, p_lng, p_accuracy, p_gps);
  update punches
     set clock_out = now(), updated_at = now(),
         out_lat = g.lat, out_lng = g.lng, out_accuracy_m = g.accuracy, out_gps = g.gps,
         note = case when coalesce(trim(p_note), '') = '' then note
                     when note = '' then trim(p_note)
                     else note || ' / ' || trim(p_note) end
   where user_id = auth.uid() and clock_out is null
  returning * into r;
  if r.id is null then
    raise exception 'You are not clocked in';
  end if;
  return r;
end $$;

revoke execute on function public.clean_gps, public.clock_in, public.clock_out from public, anon;
grant execute on function public.clock_in, public.clock_out to authenticated;

-- Staff schedule: managers plan shifts a week at a time (and can copy last
-- week's); every active staff member sees the schedule, so they know their own
-- shifts and who else is in. Times are wall-clock times in the business time
-- zone; shifts don't cross midnight.

create table public.shifts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  starts time not null,
  ends time not null,
  note text not null default '' check (length(note) <= 100),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends > starts)
);
create index shifts_day on public.shifts (day);
alter table public.shifts enable row level security;
create policy shifts_read on public.shifts for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and active));

create function public.admin_add_shift(p_user uuid, p_day date, p_starts time, p_ends time, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_starts is null or p_ends is null or p_ends <= p_starts then raise exception 'The shift has to end after it starts'; end if;
  if length(coalesce(trim(p_note), '')) > 100 then raise exception 'Please keep it shorter'; end if;
  insert into shifts (user_id, day, starts, ends, note, created_by)
  values (p_user, p_day, p_starts, p_ends, coalesce(trim(p_note), ''), auth.uid());
end $$;

create function public.admin_delete_shift(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  delete from shifts where id = p_id;
end $$;

-- Copies the 7 days starting p_from onto the 7 days starting p_to, skipping
-- any shift that's already there. Returns how many were added.
create function public.admin_copy_week(p_from date, p_to date) returns integer
language plpgsql security definer set search_path = public as $$
declare added integer;
begin
  perform require_admin();
  insert into shifts (user_id, day, starts, ends, note, created_by)
  select s.user_id, s.day + (p_to - p_from), s.starts, s.ends, s.note, auth.uid()
    from shifts s join profiles p on p.id = s.user_id and p.active
   where s.day >= p_from and s.day < p_from + 7
     and not exists (select 1 from shifts t where t.user_id = s.user_id and t.day = s.day + (p_to - p_from)
                       and t.starts = s.starts and t.ends = s.ends);
  get diagnostics added = row_count;
  return added;
end $$;

revoke execute on function public.admin_add_shift, public.admin_delete_shift, public.admin_copy_week from public, anon, authenticated;
grant execute on function public.admin_add_shift, public.admin_delete_shift, public.admin_copy_week to authenticated;

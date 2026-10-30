-- Child check-in: teachers tap a child to check them in, tap again to check
-- them out. Each visit is one child_attendance row with who checked the child
-- in and out. Only active staff can see children; writes go through
-- child_toggle so the server clock sets the times.
--
-- Seeded with 12 numbered test children until the real roster comes in with
-- the family paperwork.

create table public.children (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  classroom text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.child_attendance (
  id bigint generated always as identity primary key,
  child_id uuid not null references public.children (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  in_by uuid references public.profiles (id) on delete set null,
  out_by uuid references public.profiles (id) on delete set null,
  check (checked_out_at is null or checked_out_at >= checked_in_at)
);
create index child_attendance_in on public.child_attendance (checked_in_at desc);
-- One open visit per child.
create unique index child_attendance_one_open on public.child_attendance (child_id) where checked_out_at is null;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active)
$$;

alter table public.children enable row level security;
alter table public.child_attendance enable row level security;
create policy children_read on public.children for select to authenticated using (public.is_staff());
create policy child_attendance_read on public.child_attendance for select to authenticated using (public.is_staff());

-- Checks the child in, or out if they're here. Returns what happened.
create function public.child_toggle(p_child uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r child_attendance;
begin
  if not is_staff() then raise exception 'Your account is not active' using errcode = '42501'; end if;
  if not exists (select 1 from children where id = p_child and active) then raise exception 'Child not found'; end if;
  update child_attendance set checked_out_at = now(), out_by = auth.uid()
   where child_id = p_child and checked_out_at is null
  returning * into r;
  if r.id is not null then
    return jsonb_build_object('action', 'out', 'at', r.checked_out_at);
  end if;
  insert into child_attendance (child_id, in_by) values (p_child, auth.uid()) returning * into r;
  return jsonb_build_object('action', 'in', 'at', r.checked_in_at);
end $$;

revoke execute on function public.is_staff, public.child_toggle from public, anon, authenticated;
grant execute on function public.is_staff, public.child_toggle to authenticated;

insert into public.children (display_name, sort_order)
select 'Child ' || n, n from generate_series(1, 12) n;

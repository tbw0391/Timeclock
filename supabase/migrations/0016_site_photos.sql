-- Photos managers add to the website from their phones. The app shrinks each
-- photo to a JPEG before uploading (lib/site/photos.ts); pages refer to them as
-- "up/<uuid>.jpg" inside their sections. Anyone can view them, since the
-- website shows them; only managers can add or remove them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', true, 4194304, array['image/jpeg']);

create policy site_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'site-photos' and public.is_admin());
create policy site_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'site-photos' and public.is_admin());

-- Storage buckets and object policies.
-- Convention: the first path segment of every object is the owner's user id,
-- e.g. "<uid>/<filename>", which lets us enforce per-user write access.

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('covers', 'covers', true),
  ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

-- Public read for all three buckets.
create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "public read covers" on storage.objects
  for select using (bucket_id = 'covers');
create policy "public read event photos" on storage.objects
  for select using (bucket_id = 'event-photos');

-- Owner-folder writes (insert/update/delete) for authenticated users.
create policy "owner write avatars" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner update avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner delete avatars" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner write covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner update covers" on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner delete covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner write event photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner delete event photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-photos' and (storage.foldername(name))[1] = auth.uid()::text);

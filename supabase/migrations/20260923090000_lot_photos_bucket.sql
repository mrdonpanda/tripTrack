-- Public lot photos. Path is {YYYY-MM-DD}/{lotNumber}_{angle}.jpg.
insert into storage.buckets (id, name, public, type, allowed_mime_types)
values (
  'lotPhotos',
  'lotPhotos',
  true,
  'STANDARD'::storage.buckettype,
  array['image/jpeg']::text[]
)
on conflict (id) do update
set
  public = true,
  type = 'STANDARD'::storage.buckettype,
  allowed_mime_types = array['image/jpeg']::text[];

drop policy if exists lot_photos_insert on storage.objects;
create policy lot_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lotPhotos');

drop policy if exists lot_photos_update on storage.objects;
create policy lot_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'lotPhotos')
  with check (bucket_id = 'lotPhotos');

drop policy if exists lot_photos_delete on storage.objects;
create policy lot_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'lotPhotos');

drop policy if exists lot_photos_select on storage.objects;
create policy lot_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'lotPhotos');

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

select json_build_object(
  'bucket', exists (select 1 from storage.buckets where id = 'lotPhotos' and public = true),
  'insert_policy', exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lot_photos_insert'),
  'select_policy', exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lot_photos_select')
) as check;

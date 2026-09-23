-- Picsur 0.5.6 has no album API. album_url stores the office share text:
-- one direct image URL per line (https://img.tune67.com/i/{id}.jpg).

alter table public.trips add column if not exists album_url text;
alter table public.photos add column if not exists image_url text;

do $$
begin
  if exists (
    select 1
    from public.photos
    where image_url is null or char_length(btrim(image_url)) = 0
  ) then
    raise exception 'photos are missing image_url; upload them to Picsur before dropping storage paths';
  end if;
end $$;

drop function if exists public.shared_trip(uuid);

alter table public.photos drop column if exists storage_path;
alter table public.photos alter column image_url set not null;

drop policy if exists trip_photos_insert on storage.objects;
drop policy if exists trip_photos_update on storage.objects;
drop policy if exists trip_photos_delete on storage.objects;
drop policy if exists trip_photos_select on storage.objects;

-- This host rejects DELETE on storage.objects and storage.buckets.
-- Empty trip-photos with the Storage API, then delete the bucket there.

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

select json_build_object(
  'album_url', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trips' and column_name = 'album_url'
  ),
  'image_url', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'photos' and column_name = 'image_url' and is_nullable = 'NO'
  ),
  'storage_path', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'photos' and column_name = 'storage_path'
  ),
  'shared_trip', exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'shared_trip'
  ),
  'bucket', exists (select 1 from storage.buckets where id = 'trip-photos')
) as check;

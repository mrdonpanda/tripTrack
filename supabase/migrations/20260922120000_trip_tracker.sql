-- Car-carrier trip tracker.
-- Authenticated users own their rows. anon has no table access.
-- shared_trip(token) is the only public read, and it omits pay and user id.

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  pay_cents integer,
  created_at timestamptz not null default now(),
  constraint cities_name_not_blank check (char_length(btrim(name)) > 0),
  constraint cities_pay_nonnegative check (pay_cents is null or pay_cents >= 0)
);

create unique index if not exists cities_user_lower_name_idx
  on public.cities (user_id, lower(name));

create index if not exists cities_user_idx on public.cities (user_id);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_date date not null,
  city_name text not null,
  pay_cents integer,
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint trips_city_not_blank check (char_length(btrim(city_name)) > 0),
  constraint trips_pay_nonnegative check (pay_cents is null or pay_cents >= 0),
  constraint trips_share_token_key unique (share_token)
);

create index if not exists trips_user_date_idx on public.trips (user_id, trip_date);

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  position integer not null,
  lot_number text not null default '',
  created_at timestamptz not null default now(),
  constraint cars_position_range check (position >= 1 and position <= 15),
  constraint cars_trip_position_key unique (trip_id, position)
);

create index if not exists cars_trip_idx on public.cars (trip_id);
create index if not exists cars_user_idx on public.cars (user_id);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  car_id uuid not null references public.cars (id) on delete cascade,
  angle text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint photos_angle_check check (
    angle in (
      'top',
      'front',
      'driver_side',
      'back',
      'passenger_side',
      'keys',
      'under_vehicle'
    )
  ),
  constraint photos_car_angle_key unique (car_id, angle)
);

create index if not exists photos_car_idx on public.photos (car_id);
create index if not exists photos_user_idx on public.photos (user_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  amount_cents integer not null,
  note text not null,
  trip_id uuid references public.trips (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint expenses_amount_positive check (amount_cents > 0),
  constraint expenses_note_not_blank check (char_length(btrim(note)) > 0)
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, date);
create index if not exists expenses_trip_idx on public.expenses (trip_id);

alter table public.cities enable row level security;
alter table public.trips enable row level security;
alter table public.cars enable row level security;
alter table public.photos enable row level security;
alter table public.expenses enable row level security;

drop policy if exists cities_owner on public.cities;
create policy cities_owner on public.cities
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists trips_owner on public.trips;
create policy trips_owner on public.trips
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists cars_owner on public.cars;
create policy cars_owner on public.cars
  for all to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.user_id = auth.uid()
    )
  );

drop policy if exists photos_owner on public.photos;
create policy photos_owner on public.photos
  for all to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.cars c
      where c.id = car_id and c.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.cars c
      where c.id = car_id and c.user_id = auth.uid()
    )
  );

drop policy if exists expenses_owner on public.expenses;
create policy expenses_owner on public.expenses
  for all to authenticated
  using (
    user_id = auth.uid()
    and (
      trip_id is null
      or exists (
        select 1 from public.trips t
        where t.id = trip_id and t.user_id = auth.uid()
      )
    )
  )
  with check (
    user_id = auth.uid()
    and (
      trip_id is null
      or exists (
        select 1 from public.trips t
        where t.id = trip_id and t.user_id = auth.uid()
      )
    )
  );

revoke all on table public.cities from public, anon;
revoke all on table public.trips from public, anon;
revoke all on table public.cars from public, anon;
revoke all on table public.photos from public, anon;
revoke all on table public.expenses from public, anon;

grant select, insert, update, delete on public.cities to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, update, delete on public.cars to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;

create or replace function public.shared_trip(token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'city_name', t.city_name,
    'trip_date', t.trip_date,
    'cars', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'position', c.position,
          'lot_number', c.lot_number,
          'photos', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'angle', p.angle,
                'storage_path', p.storage_path
              )
              order by array_position(
                array[
                  'top',
                  'front',
                  'driver_side',
                  'back',
                  'passenger_side',
                  'keys',
                  'under_vehicle'
                ],
                p.angle
              )
            )
            from public.photos p
            where p.car_id = c.id
          ), '[]'::jsonb)
        )
        order by c.position
      )
      from public.cars c
      where c.trip_id = t.id
    ), '[]'::jsonb)
  )
  from public.trips t
  where t.share_token = shared_trip.token;
$$;

revoke all on function public.shared_trip(uuid) from public;
grant execute on function public.shared_trip(uuid) to anon, authenticated;

insert into storage.buckets (id, name, public, type, allowed_mime_types)
values (
  'trip-photos',
  'trip-photos',
  true,
  'STANDARD'::storage.buckettype,
  array['image/jpeg']::text[]
)
on conflict (id) do update
set
  public = true,
  type = 'STANDARD'::storage.buckettype,
  allowed_mime_types = array['image/jpeg']::text[];

drop policy if exists trip_photos_insert on storage.objects;
create policy trip_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists trip_photos_update on storage.objects;
create policy trip_photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists trip_photos_delete on storage.objects;
create policy trip_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists trip_photos_select on storage.objects;
create policy trip_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

import type { User } from '@supabase/supabase-js';

import { ANGLES, MAX_CARS, type Angle } from './angles';
import { supabase } from './supabase';

export type City = {
  id: string;
  name: string;
  pay_cents: number | null;
};

export type Trip = {
  id: string;
  trip_date: string;
  city_name: string;
  pay_cents: number | null;
  share_token: string;
};

export type Car = {
  id: string;
  trip_id: string;
  position: number;
  lot_number: string;
};

export type PhotoRow = {
  id: string;
  car_id: string;
  angle: Angle;
  storage_path: string;
};

export type Expense = {
  id: string;
  date: string;
  amount_cents: number;
  note: string;
  trip_id: string | null;
};

export type SharedPhoto = {
  angle: string;
  storage_path: string;
};

export type SharedCar = {
  position: number;
  lot_number: string;
  photos: SharedPhoto[];
};

export type SharedTrip = {
  city_name: string;
  trip_date: string;
  cars: SharedCar[];
};

export const SEED_CITIES: Array<{ name: string; pay_cents: number | null }> = [
  { name: 'Pittsburgh', pay_cents: null },
  { name: 'Altoona', pay_cents: null },
  { name: 'Buffalo', pay_cents: 75000 },
  { name: 'Rochester', pay_cents: 65000 },
  { name: 'Syracuse', pay_cents: null },
];

function fail(error: { message: string } | null, fallback: string): asserts error is null {
  if (error) throw new Error(error.message || fallback);
}

export async function seedCitiesIfNeeded(user: User): Promise<void> {
  if (user.user_metadata?.cities_seeded === true) return;
  const { count, error } = await supabase.from('cities').select('id', { count: 'exact', head: true });
  fail(error, 'Could not check cities');
  if ((count ?? 0) === 0) {
    const { error: insertError } = await supabase.from('cities').insert(
      SEED_CITIES.map((city) => ({
        user_id: user.id,
        name: city.name,
        pay_cents: city.pay_cents,
      })),
    );
    if (insertError && !/duplicate|unique/i.test(insertError.message)) {
      throw new Error(insertError.message);
    }
  }
  const { error: metaError } = await supabase.auth.updateUser({ data: { cities_seeded: true } });
  fail(metaError, 'Could not finish city setup');
}

export async function listCities(): Promise<City[]> {
  const { data, error } = await supabase.from('cities').select('id, name, pay_cents').order('name');
  fail(error, 'Could not load cities');
  return (data ?? []) as City[];
}

export async function saveCity(userId: string, name: string, payCents: number | null): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a city name');
  const cities = await listCities();
  const existing = cities.find((city) => city.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    const { error } = await supabase
      .from('cities')
      .update({ name: trimmed, pay_cents: payCents })
      .eq('id', existing.id);
    fail(error, 'Could not save the city');
    return;
  }
  const { error } = await supabase.from('cities').insert({
    user_id: userId,
    name: trimmed,
    pay_cents: payCents,
  });
  fail(error, 'Could not save the city');
}

export async function deleteCity(id: string): Promise<void> {
  const { error } = await supabase.from('cities').delete().eq('id', id);
  fail(error, 'Could not remove the city');
}

export async function loadWeek(startIso: string, endIso: string): Promise<{
  trips: Trip[];
  cars: Car[];
  photos: PhotoRow[];
  expenses: Expense[];
}> {
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, trip_date, city_name, pay_cents, share_token')
    .gte('trip_date', startIso)
    .lte('trip_date', endIso)
    .order('trip_date', { ascending: true })
    .order('city_name', { ascending: true });
  fail(error, 'Could not load trips');
  const tripRows = (trips ?? []) as Trip[];
  const tripIds = tripRows.map((trip) => trip.id);
  let cars: Car[] = [];
  if (tripIds.length) {
    const { data, error: carError } = await supabase
      .from('cars')
      .select('id, trip_id, position, lot_number')
      .in('trip_id', tripIds)
      .order('position', { ascending: true });
    fail(carError, 'Could not load cars');
    cars = (data ?? []) as Car[];
  }
  const carIds = cars.map((car) => car.id);
  let photos: PhotoRow[] = [];
  if (carIds.length) {
    const { data, error: photoError } = await supabase
      .from('photos')
      .select('id, car_id, angle, storage_path')
      .in('car_id', carIds);
    fail(photoError, 'Could not load photos');
    photos = (data ?? []) as PhotoRow[];
  }
  const { data: expenses, error: expenseError } = await supabase
    .from('expenses')
    .select('id, date, amount_cents, note, trip_id')
    .gte('date', startIso)
    .lte('date', endIso)
    .order('date', { ascending: true });
  fail(expenseError, 'Could not load expenses');
  return { trips: tripRows, cars, photos, expenses: (expenses ?? []) as Expense[] };
}

export async function createTrip(input: {
  userId: string;
  tripDate: string;
  cityName: string;
  payCents: number | null;
  carCount: number;
}): Promise<string> {
  const carCount = Math.min(MAX_CARS, Math.max(1, input.carCount));
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: input.userId,
      trip_date: input.tripDate,
      city_name: input.cityName.trim(),
      pay_cents: input.payCents,
    })
    .select('id')
    .single();
  fail(error, 'Could not create the trip');
  const tripId = (trip as { id: string }).id;
  const rows = Array.from({ length: carCount }, (_, index) => ({
    user_id: input.userId,
    trip_id: tripId,
    position: index + 1,
    lot_number: '',
  }));
  const { error: carError } = await supabase.from('cars').insert(rows);
  if (carError) {
    await supabase.from('trips').delete().eq('id', tripId);
    throw new Error(carError.message);
  }
  return tripId;
}

export async function loadTrip(tripId: string): Promise<{ trip: Trip; cars: Car[]; photos: PhotoRow[] } | null> {
  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, trip_date, city_name, pay_cents, share_token')
    .eq('id', tripId)
    .maybeSingle();
  fail(error, 'Could not load the trip');
  if (!trip) return null;
  const { data: cars, error: carError } = await supabase
    .from('cars')
    .select('id, trip_id, position, lot_number')
    .eq('trip_id', tripId)
    .order('position', { ascending: true });
  fail(carError, 'Could not load cars');
  const carRows = (cars ?? []) as Car[];
  const carIds = carRows.map((car) => car.id);
  let photos: PhotoRow[] = [];
  if (carIds.length) {
    const { data, error: photoError } = await supabase
      .from('photos')
      .select('id, car_id, angle, storage_path')
      .in('car_id', carIds);
    fail(photoError, 'Could not load photos');
    photos = (data ?? []) as PhotoRow[];
  }
  return { trip: trip as Trip, cars: carRows, photos };
}

export async function saveLotNumber(carId: string, lotNumber: string): Promise<void> {
  let last = 'Could not save the lot number';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { error } = await supabase.from('cars').update({ lot_number: lotNumber }).eq('id', carId);
    if (!error) return;
    last = error.message;
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  throw new Error(last);
}

export async function addCar(userId: string, tripId: string, position: number): Promise<void> {
  if (position > MAX_CARS) throw new Error('A trip can have 15 cars');
  const { error } = await supabase.from('cars').insert({
    user_id: userId,
    trip_id: tripId,
    position,
    lot_number: '',
  });
  fail(error, 'Could not add a car');
}

export async function removeCar(userId: string, tripId: string, carId: string): Promise<void> {
  const paths = ANGLES.map((angle) => `${userId}/${tripId}/${carId}/${angle.id}.jpg`);
  await supabase.storage.from('trip-photos').remove(paths);
  const { error } = await supabase.from('cars').delete().eq('id', carId);
  fail(error, 'Could not remove the car');
}

export async function deleteTrip(userId: string, trip: Trip, cars: Car[]): Promise<void> {
  const paths = cars.flatMap((car) => ANGLES.map((angle) => `${userId}/${trip.id}/${car.id}/${angle.id}.jpg`));
  if (paths.length) {
    await supabase.storage.from('trip-photos').remove(paths);
  }
  const { error } = await supabase.from('trips').delete().eq('id', trip.id);
  fail(error, 'Could not delete the trip');
}

export async function addExpense(input: {
  userId: string;
  date: string;
  amountCents: number;
  note: string;
}): Promise<void> {
  const note = input.note.trim();
  if (!note) throw new Error('Enter what the expense was for');
  if (input.amountCents <= 0) throw new Error('Enter an amount');
  const { error } = await supabase.from('expenses').insert({
    user_id: input.userId,
    date: input.date,
    amount_cents: input.amountCents,
    note,
    trip_id: null,
  });
  fail(error, 'Could not save the expense');
}

export async function fetchSharedTrip(token: string): Promise<SharedTrip | null> {
  const { data, error } = await supabase.rpc('shared_trip', { token });
  fail(error, 'Could not open this trip');
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const cars = Array.isArray(record.cars) ? record.cars : [];
  return {
    city_name: String(record.city_name ?? ''),
    trip_date: String(record.trip_date ?? ''),
    cars: cars.map((car) => {
      const row = car as Record<string, unknown>;
      const photos = Array.isArray(row.photos) ? row.photos : [];
      return {
        position: Number(row.position ?? 0),
        lot_number: String(row.lot_number ?? ''),
        photos: photos.map((photo) => {
          const item = photo as Record<string, unknown>;
          return {
            angle: String(item.angle ?? ''),
            storage_path: String(item.storage_path ?? ''),
          };
        }),
      };
    }),
  };
}

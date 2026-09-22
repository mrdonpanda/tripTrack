import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { Screen } from '../../src/components/ui';
import { BigButton } from '../../src/components/ui';
import { ANGLES } from '../../src/lib/angles';
import { loadWeek, type Car, type Expense, type PhotoRow, type Trip } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { formatISODate, formatTripDay, weekRange } from '../../src/lib/dates';
import { formatMoney, formatPay } from '../../src/lib/money';
import { useUploadJobs } from '../../src/lib/queueContext';
import { supabase } from '../../src/lib/supabase';
import { styles } from '../../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const jobs = useUploadJobs();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { start, end } = weekRange(new Date(), 0);
    try {
      const week = await loadWeek(formatISODate(start), formatISODate(end));
      setTrips(week.trips);
      setCars(week.cars);
      setPhotos(week.photos);
      setExpenses(week.expenses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this week');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const jobCount = jobs.length;
  const previousJobCount = useRef(jobCount);
  useEffect(() => {
    if (jobCount < previousJobCount.current) void load();
    previousJobCount.current = jobCount;
  }, [jobCount, load]);

  const payTotal = trips.reduce((sum, trip) => sum + (trip.pay_cents ?? 0), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);

  return (
    <Screen>
      <Text style={styles.title}>This week</Text>
      <Text style={styles.body}>Pay {formatMoney(payTotal)}</Text>
      <Text style={styles.body}>Expenses {formatMoney(expenseTotal)}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {error ? <BigButton label="Retry" onPress={() => void load()} /> : null}
      <BigButton label="New Trip" onPress={() => router.push('/trip/new')} />
      {trips.length === 0 ? <Text style={styles.body}>No trips this week.</Text> : null}
      {trips.map((trip) => {
        const tripCars = cars.filter((car) => car.trip_id === trip.id);
        const carIds = new Set(tripCars.map((car) => car.id));
        const covered = new Set<string>();
        for (const photo of photos) {
          if (carIds.has(photo.car_id)) covered.add(`${photo.car_id}:${photo.angle}`);
        }
        for (const job of jobs) {
          if (job.tripId === trip.id) covered.add(`${job.carId}:${job.angle}`);
        }
        const missingLots = tripCars.filter((car) => !car.lot_number.trim()).length;
        return (
          <Pressable
            key={trip.id}
            accessibilityRole="button"
            onPress={() => router.push(`/trip/${trip.id}`)}
            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.title}>{trip.city_name}</Text>
            <Text style={styles.body}>{formatTripDay(trip.trip_date)}</Text>
            <Text style={styles.body}>{formatPay(trip.pay_cents)}</Text>
            <Text style={styles.body}>
              Photos {covered.size}/{tripCars.length * ANGLES.length}
            </Text>
            <Text style={styles.body}>
              {missingLots === 0 ? 'Lot numbers complete' : `Lot numbers missing: ${missingLots}`}
            </Text>
          </Pressable>
        );
      })}
      <BigButton label="Week" tone="dark" onPress={() => router.push('/week')} />
      <BigButton label="Cities" tone="dark" onPress={() => router.push('/cities')} />
      <BigButton
        label="Sign out"
        tone="dark"
        onPress={() => {
          void supabase.auth.signOut();
        }}
      />
    </Screen>
  );
}

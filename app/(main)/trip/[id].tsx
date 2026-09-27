import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';

import { LotWorkspace } from '../../../src/components/LotWorkspace';
import { BackButton, BigButton, Screen } from '../../../src/components/ui';
import {
  addCar,
  deleteTrip,
  loadTrip,
  removeCar,
  saveLotNumber,
  type Car,
  type PhotoRow,
  type Trip,
} from '../../../src/lib/api';
import { MAX_CARS } from '../../../src/lib/angles';
import { useAuth } from '../../../src/lib/auth';
import { formatTripDay } from '../../../src/lib/dates';
import { formatPay } from '../../../src/lib/money';
import { relocateCarPhotos } from '../../../src/lib/photos';
import { useUploadQueue } from '../../../src/lib/queueContext';
import { colors, styles } from '../../../src/theme';

export default function TripScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const queue = useUploadQueue();
  const params = useLocalSearchParams<{ id?: string }>();
  const tripId = typeof params.id === 'string' ? params.id : '';
  const [trip, setTrip] = useState<Trip | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lotError, setLotError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dirtyLots = useRef<Set<string>>(new Set());
  const lotGeneration = useRef<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!tripId) return;
    try {
      const result = await loadTrip(tripId);
      if (!result) {
        setMissing(true);
        return;
      }
      setTrip(result.trip);
      setCars((current) =>
        result.cars.map((car) => {
          if (!dirtyLots.current.has(car.id)) return car;
          const typed = current.find((item) => item.id === car.id);
          return typed ? { ...car, lot_number: typed.lot_number } : car;
        }),
      );
      setPhotos(result.photos);
      setMissing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the trip');
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    return queue.onUploaded((job) => {
      if (job.tripId === tripId) void refresh();
    });
  }, [queue, tripId, refresh]);

  function onLotChange(carId: string, lotNumber: string) {
    const generation = (lotGeneration.current[carId] ?? 0) + 1;
    lotGeneration.current[carId] = generation;
    dirtyLots.current.add(carId);
    setCars((current) => current.map((car) => (car.id === carId ? { ...car, lot_number: lotNumber } : car)));
    setLotError(null);
    clearTimeout(timers.current[carId]);
    timers.current[carId] = setTimeout(() => {
      void saveLotNumber(carId, lotNumber)
        .then(() => relocateCarPhotos(carId))
        .then(() => queue.releaseCar(carId))
        .catch((err: Error) => setLotError(err.message))
        .finally(() => {
          if (lotGeneration.current[carId] === generation) dirtyLots.current.delete(carId);
        });
    }, 400);
  }

  async function onAddCar() {
    if (!session || !trip || cars.length >= MAX_CARS) return;
    const position = cars.reduce((max, car) => Math.max(max, car.position), 0) + 1;
    try {
      await addCar(session.user.id, trip.id, position);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add a car');
    }
  }

  async function onRemoveLastCar() {
    if (!session || !trip) return;
    const last = [...cars].sort((a, b) => b.position - a.position)[0];
    if (!last || cars.length <= 1) return;
    setBusy(true);
    try {
      queue.cancelCar(last.id);
      await removeCar(trip.id, last.id);
      setConfirmRemove(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the car');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!session || !trip) return;
    setBusy(true);
    try {
      queue.cancelTrip(trip.id);
      await deleteTrip(trip.id);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the trip');
      setBusy(false);
    }
  }

  if (missing) {
    return (
      <Screen>
        <BackButton />
        <Text style={styles.title}>Trip not found</Text>
      </Screen>
    );
  }

  if (!trip) {
    return (
      <Screen>
        <Text style={styles.title}>{error ?? 'Loading trip'}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton label="Home" />
      <Text style={styles.title}>{trip.city_name}</Text>
      <Text style={styles.body}>
        {formatTripDay(trip.trip_date)} {formatPay(trip.pay_cents)}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <LotWorkspace
        userId={session?.user.id ?? ''}
        tripId={trip.id}
        cars={cars}
        photos={photos}
        onLotChange={onLotChange}
        onAddCar={() => void onAddCar()}
        onRemoveLastCar={() => setConfirmRemove(true)}
        lotError={lotError}
      />
      <BigButton label="Delete trip" tone="danger" onPress={() => setConfirmDelete(true)} />
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={modalBackdrop}>
          <View style={modalCard}>
            <Text style={styles.title}>Delete this trip?</Text>
            <Text style={styles.body}>This removes the trip and its lot photos.</Text>
            <BigButton label={busy ? 'Deleting' : 'Delete trip'} tone="danger" onPress={() => void onDelete()} disabled={busy} />
            <BigButton label="Keep trip" tone="dark" onPress={() => setConfirmDelete(false)} />
          </View>
        </View>
      </Modal>
      <Modal visible={confirmRemove} transparent animationType="fade" onRequestClose={() => setConfirmRemove(false)}>
        <View style={modalBackdrop}>
          <View style={modalCard}>
            <Text style={styles.title}>Remove the last car?</Text>
            <BigButton label={busy ? 'Removing' : 'Remove car'} tone="danger" onPress={() => void onRemoveLastCar()} disabled={busy} />
            <BigButton label="Keep car" tone="dark" onPress={() => setConfirmRemove(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const modalBackdrop = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.85)',
  justifyContent: 'center' as const,
  padding: 16,
};

const modalCard = {
  backgroundColor: colors.bg,
  borderWidth: 3,
  borderColor: colors.text,
  borderRadius: 16,
  padding: 16,
  gap: 12,
};

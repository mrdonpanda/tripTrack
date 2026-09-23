import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';

import { ANGLES, MAX_CARS, angleLabel, photoKey, type Angle } from '../lib/angles';
import { useUploadJobs, useUploadQueue } from '../lib/queueContext';
import type { UploadJob } from '../lib/uploadQueue';
import { colors, styles } from '../theme';
import { LotCamera } from './LotCamera';
import { BigButton } from './ui';

export type LotCar = {
  id: string;
  position: number;
  lot_number: string;
};

export type LotPhoto = {
  car_id: string;
  angle: Angle;
  image_url: string;
};

export function LotWorkspace({
  userId,
  tripId,
  cars,
  photos,
  onLotChange,
  onAddCar,
  onRemoveLastCar,
  lotError,
}: {
  userId: string;
  tripId: string;
  cars: LotCar[];
  photos: LotPhoto[];
  onLotChange: (carId: string, lotNumber: string) => void;
  onAddCar: () => void;
  onRemoveLastCar: () => void;
  lotError?: string | null;
}) {
  const queue = useUploadQueue();
  const jobs = useUploadJobs();
  const [localUris, setLocalUris] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<{ carId: string; angle: Angle } | null>(null);

  function covered(carId: string, angle: Angle): boolean {
    const key = photoKey(carId, angle);
    if (localUris[key]) return true;
    if (jobs.some((job) => job.carId === carId && job.angle === angle)) return true;
    return photos.some((photo) => photo.car_id === carId && photo.angle === angle);
  }

  function shootNext() {
    const ordered = [...cars].sort((a, b) => a.position - b.position);
    for (const car of ordered) {
      for (const angle of ANGLES) {
        if (!covered(car.id, angle.id)) {
          setTarget({ carId: car.id, angle: angle.id });
          return;
        }
      }
    }
  }

  function onShot(photo: { uri: string; width: number; height: number }) {
    if (!target) return;
    const key = photoKey(target.carId, target.angle);
    setLocalUris((current) => ({ ...current, [key]: photo.uri }));
    queue.enqueue({
      id: key,
      localUri: photo.uri,
      width: photo.width,
      height: photo.height,
      fileName: `${target.angle}.jpg`,
      carId: target.carId,
      tripId,
      userId,
      angle: target.angle,
    });
    setTarget(null);
  }

  const allShot = cars.length > 0 && cars.every((car) => ANGLES.every((angle) => covered(car.id, angle.id)));

  return (
    <View style={{ gap: 14 }}>
      {lotError ? <Text style={styles.error}>{lotError}</Text> : null}
      {cars.map((car) => (
        <CarCard
          key={car.id}
          car={car}
          photos={photos}
          jobs={jobs}
          localUris={localUris}
          onLotChange={onLotChange}
          onShoot={(angle) => setTarget({ carId: car.id, angle })}
        />
      ))}
      <BigButton label="Add a car" onPress={onAddCar} disabled={cars.length >= MAX_CARS} tone="dark" />
      <BigButton label="Remove last car" onPress={onRemoveLastCar} disabled={cars.length <= 1} tone="danger" />
      <BigButton
        label={allShot ? 'All photos taken' : 'Shoot next'}
        onPress={shootNext}
        disabled={allShot}
      />
      {target ? (
        <LotCamera
          angleLabel={angleLabel(target.angle)}
          onClose={() => setTarget(null)}
          onShot={onShot}
        />
      ) : null}
    </View>
  );
}

function CarCard({
  car,
  photos,
  jobs,
  localUris,
  onLotChange,
  onShoot,
}: {
  car: LotCar;
  photos: LotPhoto[];
  jobs: UploadJob[];
  localUris: Record<string, string>;
  onLotChange: (carId: string, lotNumber: string) => void;
  onShoot: (angle: Angle) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Car {car.position}</Text>
      <Text style={styles.label}>Lot number</Text>
      <TextInput
        value={car.lot_number}
        onChangeText={(value) => onLotChange(car.id, value)}
        placeholder="Lot number"
        placeholderTextColor="#666666"
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {ANGLES.map((angle) => {
          const key = photoKey(car.id, angle.id);
          const job = jobs.find((item) => item.carId === car.id && item.angle === angle.id);
          const server = photos.find((photo) => photo.car_id === car.id && photo.angle === angle.id);
          const uri = localUris[key] ?? job?.localUri ?? server?.image_url;
          const status = !job
            ? null
            : job.status === 'failed'
              ? 'Retrying'
              : job.status === 'waiting'
                ? 'Need lot number'
                : 'Sending';
          return (
            <Pressable
              key={angle.id}
              testID={`chip-${car.id}-${angle.id}`}
              accessibilityRole="button"
              onPress={() => onShoot(angle.id)}
              style={{
                width: '47%',
                minHeight: 120,
                borderWidth: 3,
                borderColor: uri ? colors.ok : colors.text,
                borderRadius: 12,
                padding: 8,
                backgroundColor: colors.bg,
                justifyContent: 'center',
              }}
            >
              {uri ? (
                <Image source={{ uri }} style={{ width: '100%', height: 72, borderRadius: 8 }} resizeMode="cover" />
              ) : null}
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 6 }}>{angle.label}</Text>
              {status ? (
                <Text style={{ color: colors.yellow, fontSize: 18, fontWeight: '800' }}>{status}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}


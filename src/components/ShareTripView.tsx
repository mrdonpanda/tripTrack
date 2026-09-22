import { Image, Text, View } from 'react-native';

import { ANGLES, angleLabel } from '../lib/angles';
import { photoPublicUrl } from '../lib/config';
import { formatLongDate } from '../lib/dates';
import type { SharedTrip } from '../lib/api';
import { colors, styles } from '../theme';

export function ShareTripView({ trip }: { trip: SharedTrip }) {
  return (
    <View style={{ gap: 16, width: '100%', maxWidth: 960, alignSelf: 'center' }}>
      <Text style={styles.title}>{trip.city_name}</Text>
      <Text style={styles.body}>{formatLongDate(trip.trip_date)}</Text>
      {trip.cars.map((car) => (
        <View key={car.position} style={styles.card}>
          <Text style={styles.title}>Car {car.position}</Text>
          <Text style={styles.body}>{car.lot_number.trim() ? `Lot ${car.lot_number}` : 'Lot number missing'}</Text>
          {ANGLES.map((angle) => {
            const photo = car.photos.find((item) => item.angle === angle.id);
            return (
              <View key={angle.id} style={{ gap: 8 }}>
                <Text style={styles.label}>{angleLabel(angle.id)}</Text>
                {photo?.storage_path ? (
                  <Image
                    accessibilityLabel={angle.label}
                    source={{ uri: photoPublicUrl(photo.storage_path) }}
                    style={{ width: '100%', height: 220, backgroundColor: '#222', borderRadius: 12 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.muted}>No photo</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}


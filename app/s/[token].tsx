import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { ShareTripView } from '../../src/components/ShareTripView';
import { Screen } from '../../src/components/ui';
import { fetchSharedTrip, type SharedTrip } from '../../src/lib/api';
import { styles } from '../../src/theme';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ShareScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    if (!UUID.test(token)) {
      setLoading(false);
      setError('This link is not valid.');
      return;
    }
    fetchSharedTrip(token)
      .then((result) => {
        if (!live) return;
        if (!result) setError('This link is not valid.');
        else setTrip(result);
      })
      .catch(() => {
        if (live) setError('This link is not valid.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [token]);

  return (
    <Screen>
      {loading ? <Text style={styles.title}>Loading trip</Text> : null}
      {error ? <Text style={styles.title}>{error}</Text> : null}
      {trip ? <ShareTripView trip={trip} /> : null}
    </Screen>
  );
}

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { BackButton, BigButton, BigField, Screen } from '../../src/components/ui';
import { deleteCity, listCities, saveCity, type City } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { centsToInput, dollarsToCents, formatPay } from '../../src/lib/money';
import { styles } from '../../src/theme';

export default function CitiesScreen() {
  const { session } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [pay, setPay] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listCities();
      setCities(rows);
      setDrafts(Object.fromEntries(rows.map((city) => [city.id, centsToInput(city.pay_cents)])));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cities');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function save(city: City) {
    if (!session) return;
    try {
      await saveCity(session.user.id, city.name, dollarsToCents(drafts[city.id] ?? ''));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the city');
    }
  }

  async function add() {
    if (!session) return;
    try {
      await saveCity(session.user.id, name, dollarsToCents(pay));
      setName('');
      setPay('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the city');
    }
  }

  async function remove(city: City) {
    try {
      await deleteCity(city.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the city');
    }
  }

  return (
    <Screen>
      <BackButton />
      <Text style={styles.title}>Cities</Text>
      <Text style={styles.muted}>Default pay is copied onto each new trip. Changing it does not change past trips.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {cities.map((city) => (
        <View key={city.id} style={styles.card}>
          <Text style={styles.title}>{city.name}</Text>
          <Text style={styles.muted}>Current {formatPay(city.pay_cents)}</Text>
          <BigField
            label="Default pay"
            value={drafts[city.id] ?? ''}
            onChangeText={(value) => setDrafts((current) => ({ ...current, [city.id]: value }))}
            keyboardType="decimal-pad"
            placeholder="Blank until you set it"
          />
          <BigButton label="Save pay" onPress={() => void save(city)} />
          <BigButton label={`Remove ${city.name}`} tone="danger" onPress={() => void remove(city)} />
        </View>
      ))}
      <Text style={styles.title}>Add a city</Text>
      <BigField label="City" value={name} onChangeText={setName} autoCapitalize="words" placeholder="City name" />
      <BigField label="Default pay" value={pay} onChangeText={setPay} keyboardType="decimal-pad" placeholder="Optional" />
      <BigButton label="Add city" onPress={() => void add()} />
    </Screen>
  );
}

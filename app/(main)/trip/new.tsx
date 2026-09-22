import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BackButton, BigButton, BigField, Screen } from '../../../src/components/ui';
import { DEFAULT_CAR_COUNT, MAX_CARS } from '../../../src/lib/angles';
import { createTrip, listCities, saveCity, type City } from '../../../src/lib/api';
import { useAuth } from '../../../src/lib/auth';
import { formatISODate, formatTripDay } from '../../../src/lib/dates';
import { centsToInput, dollarsToCents, formatPay } from '../../../src/lib/money';
import { colors, styles } from '../../../src/theme';

export default function NewTripScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [cityName, setCityName] = useState<string | null>(null);
  const [other, setOther] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [saveOther, setSaveOther] = useState(true);
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [pay, setPay] = useState('');
  const [carCount, setCarCount] = useState(DEFAULT_CAR_COUNT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCities(await listCities());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cities');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function chooseCity(city: City) {
    setOther(false);
    setCityName(city.name);
    setPay(centsToInput(city.pay_cents));
  }

  async function start() {
    if (!session) return;
    const name = other ? otherName.trim() : cityName;
    if (!name) {
      setError('Choose a city');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payCents = dollarsToCents(pay);
      if (other && saveOther) {
        await saveCity(session.user.id, name, payCents);
      }
      const id = await createTrip({
        userId: session.user.id,
        tripDate: formatISODate(date),
        cityName: name,
        payCents,
        carCount,
      });
      router.replace(`/trip/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the trip');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackButton />
      <Text style={styles.title}>New trip</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {cities.map((city) => {
        const selected = !other && cityName === city.name;
        return (
          <Pressable
            key={city.id}
            accessibilityRole="button"
            onPress={() => chooseCity(city)}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: selected ? colors.yellow : colors.bg,
                borderColor: colors.text,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: selected ? colors.ink : colors.text }]}>
              {city.name} {formatPay(city.pay_cents)}
            </Text>
          </Pressable>
        );
      })}
      <BigButton
        label="Other city"
        tone={other ? 'yellow' : 'dark'}
        onPress={() => {
          setOther(true);
          setCityName(null);
        }}
      />
      {other ? (
        <View style={{ gap: 12 }}>
          <BigField label="City name" value={otherName} onChangeText={setOtherName} autoCapitalize="words" />
          <BigButton
            label={saveOther ? 'Saved for next time' : 'Use this trip only'}
            tone="dark"
            onPress={() => setSaveOther((value) => !value)}
          />
        </View>
      ) : null}
      <BigButton label={`Date ${formatTripDay(formatISODate(date))}`} tone="dark" onPress={() => setShowDate(true)} />
      {showDate ? (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(event, selected) => {
            setShowDate(false);
            if (event.type === 'set' && selected) setDate(selected);
          }}
        />
      ) : null}
      <BigField
        label="Pay for this trip"
        value={pay}
        onChangeText={setPay}
        keyboardType="decimal-pad"
        placeholder="Leave blank if pay is not set"
      />
      <Text style={styles.label}>Cars</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <BigButton
            label="−"
            tone="dark"
            onPress={() => setCarCount((value) => Math.max(1, value - 1))}
            disabled={carCount <= 1}
          />
        </View>
        <Text style={[styles.title, { minWidth: 120, textAlign: 'center' }]}>{carCount}</Text>
        <View style={{ flex: 1 }}>
          <BigButton
            label="+"
            tone="dark"
            onPress={() => setCarCount((value) => Math.min(MAX_CARS, value + 1))}
            disabled={carCount >= MAX_CARS}
          />
        </View>
      </View>
      <BigButton label={busy ? 'Starting' : 'Start trip'} onPress={() => void start()} disabled={busy} />
    </Screen>
  );
}

import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { BackButton, BigButton, BigField, Screen } from '../../src/components/ui';
import { addExpense, loadWeek, type Expense, type Trip } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { formatISODate, formatRangeLabel, formatTripDay, weekRange } from '../../src/lib/dates';
import { dollarsToCents, formatMoney, formatPay } from '../../src/lib/money';
import { formatWeekClipboard } from '../../src/lib/weekText';
import { styles } from '../../src/theme';

export default function WeekScreen() {
  const { session } = useAuth();
  const [offset, setOffset] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const range = weekRange(new Date(), offset);

  const load = useCallback(async () => {
    const current = weekRange(new Date(), offset);
    try {
      const week = await loadWeek(formatISODate(current.start), formatISODate(current.end));
      setTrips(week.trips);
      setExpenses(week.expenses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the week');
    }
  }, [offset]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function copyWeek() {
    const text = formatWeekClipboard(trips, expenses);
    await Clipboard.setStringAsync(text);
    setCopied(true);
  }

  async function saveExpense() {
    if (!session) return;
    try {
      const cents = dollarsToCents(amount);
      if (cents == null) throw new Error('Enter an amount');
      await addExpense({
        userId: session.user.id,
        date: formatISODate(expenseDate),
        amountCents: cents,
        note,
      });
      setNote('');
      setAmount('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the expense');
    }
  }

  const payTotal = trips.reduce((sum, trip) => sum + (trip.pay_cents ?? 0), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);

  return (
    <Screen>
      <BackButton />
      <Text style={styles.title}>Week</Text>
      <Text style={styles.body}>{formatRangeLabel(range.start, range.end)}</Text>
      <BigButton
        label={offset === 0 ? 'Previous week' : 'This week'}
        tone="dark"
        onPress={() => setOffset((value) => (value === 0 ? -1 : 0))}
      />
      <BigButton label={copied ? 'Copied' : 'Copy'} onPress={() => void copyWeek()} />
      <Text style={styles.muted}>Expenses are listed separately. They are not taken out of trip pay.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {trips.length === 0 ? <Text style={styles.body}>No trips</Text> : null}
      {trips.map((trip) => (
        <Text key={trip.id} style={styles.body}>
          {formatTripDay(trip.trip_date)} {trip.city_name} {formatPay(trip.pay_cents)}
        </Text>
      ))}
      <Text style={styles.title}>Pay {formatMoney(payTotal)}</Text>
      <Text style={styles.title}>Expenses</Text>
      {expenses.length === 0 ? <Text style={styles.body}>None</Text> : null}
      {expenses.map((expense) => (
        <Text key={expense.id} style={styles.body}>
          {formatTripDay(expense.date)} {expense.note} {formatMoney(expense.amount_cents)}
        </Text>
      ))}
      <Text style={styles.body}>Expenses total {formatMoney(expenseTotal)}</Text>
      <Text style={styles.title}>Log an expense</Text>
      <BigField label="What" value={note} onChangeText={setNote} placeholder="Oil" autoCapitalize="sentences" />
      <BigField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="12.50" />
      <BigButton label={`Date ${formatTripDay(formatISODate(expenseDate))}`} tone="dark" onPress={() => setShowDate(true)} />
      {showDate ? (
        <DateTimePicker
          value={expenseDate}
          mode="date"
          onChange={(event, selected) => {
            setShowDate(false);
            if (event.type === 'set' && selected) setExpenseDate(selected);
          }}
        />
      ) : null}
      <BigButton label="Add expense" onPress={() => void saveExpense()} />
    </Screen>
  );
}

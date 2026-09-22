import { formatTripDay } from './dates';
import { formatMoney, formatPay } from './money';

export type WeekTripLine = {
  trip_date: string;
  city_name: string;
  pay_cents: number | null;
};

export type WeekExpenseLine = {
  date: string;
  note: string;
  amount_cents: number;
};

export function formatWeekClipboard(trips: WeekTripLine[], expenses: WeekExpenseLine[]): string {
  const tripLines = [...trips]
    .sort((a, b) => a.trip_date.localeCompare(b.trip_date) || a.city_name.localeCompare(b.city_name))
    .map((trip) => `${formatTripDay(trip.trip_date)}  ${trip.city_name}  ${formatPay(trip.pay_cents)}`);
  const payTotal = trips.reduce((sum, trip) => sum + (trip.pay_cents ?? 0), 0);
  const expenseLines = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date) || a.note.localeCompare(b.note))
    .map((expense) => `${formatTripDay(expense.date)}  ${expense.note}  ${formatMoney(expense.amount_cents)}`);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount_cents, 0);

  return [
    tripLines.length ? tripLines.join('\n') : 'No trips',
    '',
    `Pay total: ${formatMoney(payTotal)}`,
    '',
    'Expenses',
    expenseLines.length ? expenseLines.join('\n') : 'None',
    '',
    `Expenses total: ${formatMoney(expenseTotal)}`,
  ].join('\n');
}

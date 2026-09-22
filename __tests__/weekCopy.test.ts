import { formatISODate, weekRange } from '../src/lib/dates';
import { formatWeekClipboard } from '../src/lib/weekText';

describe('week sheet', () => {
  it('uses Monday through Sunday in local time', () => {
    const tuesday = weekRange(new Date(2026, 8, 22), 0);
    expect(formatISODate(tuesday.start)).toBe('2026-09-21');
    expect(formatISODate(tuesday.end)).toBe('2026-09-27');
    const sunday = weekRange(new Date(2026, 8, 27), 0);
    expect(formatISODate(sunday.start)).toBe('2026-09-21');
    const previous = weekRange(new Date(2026, 8, 22), -1);
    expect(formatISODate(previous.start)).toBe('2026-09-14');
    expect(formatISODate(previous.end)).toBe('2026-09-20');
  });

  it('copies trips and a separate expense list without subtracting expenses', () => {
    const text = formatWeekClipboard(
      [
        { trip_date: '2026-09-22', city_name: 'Pittsburgh', pay_cents: 75000 },
        { trip_date: '2026-09-23', city_name: 'Syracuse', pay_cents: null },
      ],
      [{ date: '2026-09-22', note: 'Oil', amount_cents: 1250 }],
    );
    expect(text).toBe(
      [
        'Tue 9/22  Pittsburgh  $750.00',
        'Wed 9/23  Syracuse  Pay not set',
        '',
        'Pay total: $750.00',
        '',
        'Expenses',
        'Tue 9/22  Oil  $12.50',
        '',
        'Expenses total: $12.50',
      ].join('\n'),
    );
    expect(text).not.toContain('$737.50');
  });
});

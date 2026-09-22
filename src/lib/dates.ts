const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatTripDay(iso: string): string {
  const date = parseISODate(iso);
  return `${WEEKDAYS[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function weekRange(anchor: Date, weekOffset: number): { start: Date; end: Date } {
  const local = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const day = local.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(local);
  start.setDate(local.getDate() + mondayOffset + weekOffset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export function formatRangeLabel(start: Date, end: Date): string {
  return `${formatTripDay(formatISODate(start))} – ${formatTripDay(formatISODate(end))}`;
}

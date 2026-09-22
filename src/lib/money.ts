export function dollarsToCents(input: string): number | null {
  const trimmed = input.trim().replace(/[$,]/g, '');
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    throw new Error('Enter a dollar amount like 750 or 12.50');
  }
  return Math.round(Number(trimmed) * 100);
}

export function centsToInput(cents: number | null): string {
  if (cents == null) return '';
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

export function formatMoney(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, '0');
  const withCommas = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}$${withCommas}.${remainder}`;
}

export function formatPay(cents: number | null): string {
  if (cents == null) return 'Pay not set';
  return formatMoney(cents);
}

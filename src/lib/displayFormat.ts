export function atomicUsdc(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const padded = value.padStart(7, '0');
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, '');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${groupedWhole}.${fraction}` : groupedWhole;
}

// Rounds atomic USDC (6 decimals) half-up to cents and always shows two
// decimals, for summary totals where sub-cent precision is noise.
export function atomicUsdcCents(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const cents = ((BigInt(value) + 5_000n) / 10_000n).toString().padStart(3, '0');
  const whole = cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${whole}.${cents.slice(-2)}`;
}

export function reputationRate(value: number | null): string {
  if (value === null) return '–';
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}%`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.ceil(seconds / 3600)}h`;
  return `${Math.ceil(seconds / 86400)}d`;
}

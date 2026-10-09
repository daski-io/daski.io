export function atomicUsdc(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const padded = value.padStart(7, '0');
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, '');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${groupedWhole}.${fraction}` : groupedWhole;
}

export function reputationRate(value: number | null): string {
  if (value === null) return '–';
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}%`;
}

// A provider can record on-chain that a failed order was later recovered. The
// order still counts as failed in every other figure, including the completion
// rate; this note only adds that fact. Zero and an unread count show nothing.
export function recoveredOrdersNote(count: string | null | undefined): string | null {
  if (typeof count !== 'string' || !/^\d+$/.test(count)) return null;
  const recovered = BigInt(count);
  if (recovered === 0n) return null;
  return `${recovered} failed order${recovered === 1n ? '' : 's'} later recovered`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.ceil(seconds / 3600)}h`;
  return `${Math.ceil(seconds / 86400)}d`;
}

export function atomicUsdc(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const padded = value.padStart(7, '0');
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
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

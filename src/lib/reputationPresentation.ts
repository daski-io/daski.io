import type { StandardOutcome } from './api.ts';

function atomicUsdc(value: string): string {
  const padded = value.padStart(7, '0');
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.ceil(seconds / 3600)}h`;
  return `${Math.ceil(seconds / 86400)}d`;
}

function reputationRate(value: number | null): string {
  if (value === null) return '–';
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}%`;
}

export interface ReputationPresentationRow {
  label: string;
  value: string;
}

export function reputationPresentation(outcome: StandardOutcome): {
  rows: ReputationPresentationRow[];
  recentPurchases: ReputationPresentationRow[];
} {
  const reputation = outcome.reputation;
  const satisfaction = reputation.valueWeightedBuyerSatisfactionRate ??
    reputation.buyerSatisfactionRate;
  return {
    rows: [
      { label: 'Provider transactions', value: outcome.providerReputation.transactionCount },
      { label: 'Service transactions', value: outcome.serviceReputation.transactionCount },
      { label: 'Outcome transactions', value: reputation.transactionCount },
      {
        label: `Completion (${reputation.completionSampleSize} samples)`,
        value: reputationRate(reputation.completionRate),
      },
      {
        label: `Buyer satisfaction (${reputation.confirmationSampleSize} samples)`,
        value: reputationRate(satisfaction),
      },
      {
        label: `Avg fulfillment (${reputation.fulfillmentSampleSize} samples)`,
        value: reputation.averageFulfillmentSeconds === null
          ? '–'
          : formatDuration(reputation.averageFulfillmentSeconds),
      },
      { label: 'All-time sales', value: `${atomicUsdc(reputation.totalPaid)} USDC` },
      { label: 'All-time refunds', value: `${atomicUsdc(reputation.totalRefunded)} USDC` },
      { label: 'Finalized block', value: reputation.finalizedBlock ?? '–' },
    ],
    recentPurchases: reputation.recentPurchases.map((purchase) => ({
      label: purchase.timestamp,
      value: `${atomicUsdc(purchase.amount)} USDC`,
    })),
  };
}

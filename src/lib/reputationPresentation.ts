import type { StandardOutcome, StandardReputation } from './api.ts';
import { atomicUsdc, formatDuration, reputationRate } from './displayFormat.ts';

export interface ReputationPresentationRow {
  label: string;
  value: string;
}

function summary(scope: string, reputation: StandardReputation): ReputationPresentationRow[] {
  const satisfaction = reputation.valueWeightedBuyerSatisfactionRate ??
    reputation.buyerSatisfactionRate;
  return [
    { label: `${scope} transactions`, value: reputation.transactionCount },
    {
      label: `${scope} completion (${reputation.completionSampleSize})`,
      value: reputationRate(reputation.completionRate),
    },
    {
      label: `${scope} satisfaction (${reputation.confirmationSampleSize})`,
      value: reputationRate(satisfaction),
    },
    { label: `${scope} sales`, value: `${atomicUsdc(reputation.totalPaid)} USDC` },
    { label: `${scope} refunds`, value: `${atomicUsdc(reputation.totalRefunded)} USDC` },
    {
      label: `${scope} avg fulfillment (${reputation.fulfillmentSampleSize})`,
      value: reputation.averageFulfillmentSeconds === null
        ? '–'
        : formatDuration(reputation.averageFulfillmentSeconds),
    },
  ];
}

function purchaseTimestamp(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const hour = parsed.getUTCHours();
  const minute = String(parsed.getUTCMinutes()).padStart(2, '0');
  const clockHour = hour % 12 || 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${months[parsed.getUTCMonth()]} ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}, `
    + `${clockHour}:${minute} ${period} UTC`;
}

export function reputationPresentation(outcome: StandardOutcome): {
  providerRows: ReputationPresentationRow[];
  serviceRows: ReputationPresentationRow[];
  rows: ReputationPresentationRow[];
  recentPurchases: ReputationPresentationRow[];
} {
  const reputation = outcome.reputation;
  const satisfaction = reputation.valueWeightedBuyerSatisfactionRate ??
    reputation.buyerSatisfactionRate;
  return {
    providerRows: summary('Provider', outcome.providerReputation),
    serviceRows: summary('Service', outcome.serviceReputation),
    rows: [
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
      label: purchaseTimestamp(purchase.timestamp),
      value: `${atomicUsdc(purchase.amount)} USDC`,
    })),
  };
}

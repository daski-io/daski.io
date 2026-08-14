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
  ];
}

function purchaseTimestamp(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return `${new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(parsed)} UTC`;
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

import type { StandardOutcome, StandardRailMetadata } from './api.ts';
import { atomicUsdc } from './displayFormat.ts';

export interface PublicMarketplacePurchase {
  amount: string;
  outcome: StandardOutcome;
  timestamp: string;
}

export interface MarketplacePresentation {
  finalizedBlock: string | null;
  purchases: PublicMarketplacePurchase[];
  serviceCount: number;
  totalPaid: string;
  transactionCount: string;
}

function addDecimalStrings(values: string[]): string {
  return values.reduce((total, value) => total + BigInt(value), 0n).toString();
}

export function marketplacePresentation(
  metadata: StandardRailMetadata | null,
): MarketplacePresentation {
  const outcomes = metadata?.outcomes ?? [];
  const finalizedBlocks = outcomes
    .map((outcome) => outcome.reputation.finalizedBlock)
    .filter((value): value is string => value !== null)
    .map(BigInt);
  const finalizedBlock = finalizedBlocks.reduce<bigint | null>(
    (latest, block) => latest === null || block > latest ? block : latest,
    null,
  );
  const purchases = outcomes
    .flatMap((outcome) => outcome.reputation.recentPurchases.map((purchase) => ({
      ...purchase,
      outcome,
    })))
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));

  return {
    finalizedBlock: finalizedBlock?.toString() ?? null,
    purchases,
    serviceCount: outcomes.length,
    totalPaid: atomicUsdc(addDecimalStrings(outcomes.map((outcome) => outcome.reputation.totalPaid))),
    transactionCount: addDecimalStrings(
      outcomes.map((outcome) => outcome.reputation.transactionCount),
    ),
  };
}

export function relativeTime(value: string, now = Date.now()): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1_000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

import type {
  PublicMarketplacePurchase,
  StandardOutcome,
  StandardRailMetadata,
} from './api.ts';
import { atomicUsdc } from './displayFormat.ts';

export interface MarketplacePurchase extends PublicMarketplacePurchase {
  outcome: StandardOutcome;
}

export interface MarketplacePresentation {
  safeBlock: string | null;
  purchases: MarketplacePurchase[];
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
  const services = [...new Map(outcomes.map((outcome) => [
    outcome.serviceId.toLowerCase(),
    outcome,
  ])).values()];
  const outcomesById = new Map(outcomes.map((outcome) => [
    `${outcome.providerAgentId}:${outcome.outcomeId}`,
    outcome,
  ]));
  const safeBlocks = services
    .map((outcome) => outcome.serviceReputation.safeBlock)
    .filter((value): value is string => value !== null)
    .map(BigInt);
  const safeBlock = safeBlocks.reduce<bigint | null>(
    (latest, block) => latest === null || block > latest ? block : latest,
    null,
  );
  const purchases = services
    .flatMap((outcome) => outcome.serviceReputation.recentPurchases.map((purchase) => ({
      ...purchase,
      outcome: outcomesById.get(`${outcome.providerAgentId}:${purchase.outcomeId}`) ?? outcome,
    })))
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));

  return {
    safeBlock: safeBlock?.toString() ?? null,
    purchases,
    serviceCount: services.length,
    totalPaid: atomicUsdc(addDecimalStrings(
      services.map((outcome) => outcome.serviceReputation.totalPaid),
    )),
    transactionCount: addDecimalStrings(
      services.map((outcome) => outcome.serviceReputation.transactionCount),
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

// Serializable slice of the chain metadata that the activity page renders.
// Passing this to the island instead of the full metadata keeps the
// hydration payload to the rows on screen rather than every reputation block.
export interface ActivityRow extends PublicMarketplacePurchase {
  serviceId: string;
  serviceName: string;
  skillName: string;
}

export interface ActivityView {
  network: string;
  chainId: number;
  contracts: StandardRailMetadata['contracts'];
  safeBlock: string | null;
  serviceCount: number;
  totalPaid: string;
  transactionCount: string;
  purchases: ActivityRow[];
}

export const ACTIVITY_ROW_LIMIT = 50;

export function activityView(
  metadata: StandardRailMetadata,
  limit = ACTIVITY_ROW_LIMIT,
): ActivityView {
  const presentation = marketplacePresentation(metadata);
  return {
    network: metadata.network,
    chainId: metadata.chainId,
    contracts: metadata.contracts,
    safeBlock: presentation.safeBlock,
    serviceCount: presentation.serviceCount,
    totalPaid: presentation.totalPaid,
    transactionCount: presentation.transactionCount,
    purchases: presentation.purchases.slice(0, limit).map(({ outcome, ...purchase }) => ({
      ...purchase,
      serviceId: outcome.serviceId,
      serviceName: outcome.service.name,
      skillName: outcome.skill.name,
    })),
  };
}

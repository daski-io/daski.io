import type {
  ProviderDetail,
  PublicMarketplacePurchase,
  PublicService,
  StandardOutcome,
  StandardRailMetadata,
  StandardReputation,
} from './api.ts';

export interface ProviderPurchase extends PublicMarketplacePurchase {
  outcome: StandardOutcome;
}

export interface ProviderServicePresentation {
  service: PublicService;
  reputation: StandardReputation | null;
}

export interface ProviderProfilePresentation {
  reputation: StandardReputation | null;
  services: ProviderServicePresentation[];
  purchases: ProviderPurchase[];
}

function reputationBlock(reputation: StandardReputation): bigint {
  return reputation.safeBlock === null ? -1n : BigInt(reputation.safeBlock);
}

function laterOutcome(
  current: StandardOutcome | undefined,
  candidate: StandardOutcome,
  scope: 'providerReputation' | 'serviceReputation',
): StandardOutcome {
  if (!current) return candidate;
  return reputationBlock(candidate[scope]) > reputationBlock(current[scope])
    ? candidate
    : current;
}

export function providerProfilePresentation(
  provider: ProviderDetail,
  metadata: StandardRailMetadata | null,
): ProviderProfilePresentation {
  const outcomes = (metadata?.outcomes ?? []).filter(
    (outcome) => outcome.providerAgentId === provider.providerAgentId,
  );
  let providerOutcome: StandardOutcome | undefined;
  const outcomesById = new Map<string, StandardOutcome>();
  const outcomesByService = new Map<string, StandardOutcome>();

  for (const outcome of outcomes) {
    providerOutcome = laterOutcome(providerOutcome, outcome, 'providerReputation');
    outcomesById.set(outcome.outcomeId, outcome);
    const serviceId = outcome.serviceId.toLowerCase();
    outcomesByService.set(
      serviceId,
      laterOutcome(outcomesByService.get(serviceId), outcome, 'serviceReputation'),
    );
  }

  const seenPurchases = new Set<string>();
  const purchases = (providerOutcome?.providerReputation.recentPurchases ?? [])
    .flatMap((purchase) => {
      const outcome = outcomesById.get(purchase.outcomeId);
      return outcome ? [{ ...purchase, outcome }] : [];
    })
    .filter((purchase) => {
      if (seenPurchases.has(purchase.orderKey)) return false;
      seenPurchases.add(purchase.orderKey);
      return true;
    })
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));

  return {
    reputation: providerOutcome?.providerReputation ?? null,
    services: provider.services.map((service) => ({
      service,
      reputation: outcomesByService.get(service.serviceId.toLowerCase())?.serviceReputation ?? null,
    })),
    purchases,
  };
}

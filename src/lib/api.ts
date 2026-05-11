/**
 * Public API client for the Daski Gateway. The marketing site only consumes
 * the read-only `/public/v1/*` and `/health` endpoints; buyer-side flows
 * (purchase, settle, etc.) live in the agent's MCP runtime, not here.
 */

export const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? 'https://sandbox-gateway.daski.io';

export interface PublicSkillPricingModel {
  kind: string;
  source: string | null;
  hint: string | null;
}

export interface PublicSkill {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | null;
  pricingModel: string | null;
  pricingModelDetail?: PublicSkillPricingModel | null;
  variable: boolean;
  paymentRequired: boolean;
  /** Optional — gateway public REST started returning these in 2026-05. */
  requiredFields?: string[] | null;
  requiresAssetOwnership?: boolean;
  requiresCapability?: boolean;
  assetType?: string | null;
}

export interface PublicServicePricing {
  currency: string | null;
  basePrice: string | null;
  pricingModel: string | null;
  variable: boolean;
  billingModel: string | null;
}

export interface PublicService {
  agentId: string;
  name: string;
  providerAddress: string;
  agentURI: string;
  category: string | null;
  serviceDescription: string | null;
  serviceLifecycle: string | null;
  turnaroundEstimate: string | null;
  providerA2AUrl: string | null;
  /**
   * Provider-level identity from the ERC-8004 registration file. Distinct
   * from `name` (the service offering). Both come from the gateway's
   * /public/v1/services/:agentId response. May be null if the provider
   * exposes a flat agent card without registration-level metadata.
   */
  providerName: string | null;
  providerDescription: string | null;
  /**
   * Primary on-chain service identity in `ServiceRegistry`. With current
   * 1:1 cardinality (one provider lists one service) this is the only
   * service; gateway returns null if the provider's agent card has no
   * resolvable skill / marketplace extension. The triple
   * (providerAgentId, serviceSlug, serviceVersion) hashes to serviceId.
   */
  serviceId: string | null;
  serviceSlug: string | null;
  serviceVersion: string | null;
  pricing: PublicServicePricing;
  skills: PublicSkill[];
}

export interface PublicActivityRow {
  txHash: string;
  buyerAgentId: string;
  providerAgentId: string;
  providerName: string | null;
  amount: string;
  skillId: string | null;
  timestamp: string;
}

export interface PublicStats {
  chain: { chainId: number; network: string; blockNumber: string };
  marketplace: { providerCount: number; paidCount: number; totalVolumeUsdc: string };
  contracts: {
    paymentRouter: string;
    providerRegistry: string;
    /** Optional — older gateway builds (pre-2026-05) omitted this field. */
    serviceRegistry?: string | null;
    identityRegistry: string;
    x402Adapter: string;
    permitAdapter: string | null;
    approvalAdapter: string | null;
    reputationStorage: string | null;
    usdc: string;
  };
}

/**
 * Provider reputation derived from on-chain ReputationStorage counters.
 * Rates are 0..1 floats, or null when there's no denominator yet — null
 * means "no transaction history" and the UI should render the empty state
 * rather than "0%". The whole `reputation` field is null when the gateway
 * has no ReputationStorage configured (e.g. local dev without the contract
 * deployed).
 */
export interface PublicServiceReputation {
  totalTransactions: number;
  completionRate: number | null;
  buyerSatisfactionRate: number | null;
  completedCount: number;
  failedCount: number;
  canceledCount: number;
  confirmedCount: number;
  notConfirmedCount: number;
}

/**
 * Service-scoped reputation. Same shape as `PublicServiceReputation` plus
 * `totalRefundedUsdc` (the contract tracks refunds per-service only) and
 * the `serviceId` these counters scope to.
 */
export interface PublicServiceLevelReputation extends PublicServiceReputation {
  totalRefundedUsdc: string;
  serviceId: string;
}

export interface ServiceDetail extends PublicService {
  recentPurchases: PublicActivityRow[];
  reputation: PublicServiceReputation | null;
  /**
   * Service-scoped reputation. Null when the gateway has no
   * ReputationStorage configured OR the provider has no resolvable
   * primary serviceId (e.g. agent card without a marketplace extension).
   */
  serviceReputation: PublicServiceLevelReputation | null;
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, { signal });
  if (!res.ok) {
    throw new Error(`gateway ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

export function getServices(signal?: AbortSignal) {
  return fetchJson<{ services: PublicService[]; cachedAt: string | null }>(
    '/public/v1/services',
    signal,
  );
}

export function getServiceDetail(agentId: string, signal?: AbortSignal) {
  return fetchJson<ServiceDetail>(`/public/v1/services/${encodeURIComponent(agentId)}`, signal);
}

export function getActivity(limit = 50, signal?: AbortSignal) {
  return fetchJson<{ activity: PublicActivityRow[] }>(
    `/public/v1/activity?limit=${limit}`,
    signal,
  );
}

export function getStats(signal?: AbortSignal) {
  return fetchJson<PublicStats>('/public/v1/stats', signal);
}

/* -------------------- Helpers -------------------- */

const BASESCAN = 'https://sepolia.basescan.org';

export function basescanTx(hash: string) {
  return `${BASESCAN}/tx/${hash}`;
}

export function basescanAddress(address: string) {
  return `${BASESCAN}/address/${address}`;
}

/**
 * Basescan's ERC-721 inspector URL for a specific tokenId. Renders the
 * NFT panel (image / `tokenURI` metadata / owner) for the agent's
 * ERC-8004 identity NFT minted by IdentityRegistry.
 */
export function basescanNft(contract: string, tokenId: string) {
  return `${BASESCAN}/token/${contract}?a=${tokenId}`;
}

export function shortAddress(addr: string, head = 6, tail = 4) {
  if (!addr || !addr.startsWith('0x') || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** Buyer agent ids are bigints stringified; show them in a similar
 *  shape to addresses so the activity feed reads consistently. */
export function shortBuyer(agentId: string) {
  if (!agentId) return '-';
  return `agent#${agentId}`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

/** Map provider category → service-card icon/color in the UI. */
export function categoryToIcon(category: string | null | undefined) {
  switch ((category ?? '').toLowerCase()) {
    case 'domains':
    case 'infrastructure':
      return { name: 'domain' as const, color: 'var(--mint-400)', cat: 'domains' };
    case 'hosting':
    case 'compute':
      return { name: 'server' as const, color: '#6aa9ee', cat: 'hosting' };
    case 'legal':
      return { name: 'legal' as const, color: '#f0a878', cat: 'legal' };
    case 'email':
      return { name: 'mail' as const, color: '#e7b34a', cat: 'email' };
    default:
      return { name: 'domain' as const, color: 'var(--mint-400)', cat: 'domains' };
  }
}

/** Compute a price-range string for a service from its skills.
 *  Falls back to the service-level pricing if no skill prices are set. */
export function priceRange(service: PublicService): string {
  const paid = service.skills.filter((s) => s.paymentRequired);
  const numericPrices = paid
    .map((s) => (s.basePrice ? Number(s.basePrice) : null))
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));

  if (numericPrices.length > 0) {
    const min = Math.min(...numericPrices);
    const max = Math.max(...numericPrices);
    return min === max
      ? `${min.toFixed(2)} USDC`
      : `${min.toFixed(2)} – ${max.toFixed(2)} USDC`;
  }

  if (service.pricing.basePrice) {
    return `${Number(service.pricing.basePrice).toFixed(2)} USDC`;
  }

  // Live / variable pricing: show a hint instead of a hard range.
  if (service.pricing.variable || service.skills.some((s) => s.variable)) {
    return 'live pricing';
  }
  return '-';
}

/** Synthesize a chip list (small monospace tags) for service cards.
 *  In the design these are TLDs (.xyz, .io, .agent). For a real provider we
 *  fall back to listing skill names so the card has visual texture. */
export function serviceChips(service: PublicService, max = 4): string[] {
  // Heuristic: domain providers list TLDs in skill descriptions
  // (e.g., "Register a .io domain"). Surface up to `max` short skill names.
  const paidSkills = service.skills.filter((s) => s.paymentRequired);
  const fromSkills = paidSkills.slice(0, max).map((s) => s.id);
  return fromSkills.length > 0 ? fromSkills : service.skills.slice(0, max).map((s) => s.id);
}

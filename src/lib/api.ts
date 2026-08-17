import type { CategoryFamily } from '../config/service-taxonomy';
import { parseOutcomeIndex, parseProviderAgentUri, parseRailMetadata } from './railMetadata';
import { atomicUsdc, formatDuration } from './displayFormat';

export { atomicUsdc, formatDuration, reputationRate } from './displayFormat';

export const GATEWAY_URL =
  (import.meta.env.PUBLIC_GATEWAY_URL as string | undefined) ??
  'https://sandbox-gateway.daski.io';

export interface StandardOutcome {
  providerAgentId: string;
  serviceId: string;
  outcomeId: string;
  title: string;
  description: string;
  bindingProfile: 'stock-fixed-v1' | 'recipe-bound-v1';
  pricingMode: 'fixed' | 'dynamic';
  fixedGrossAmount: string;
  splitterDeploymentBlockNumber: string;
  token: string;
  payTo: string;
  providerPayee: string;
  daskiCommissionReceiver: string;
  commissionBps: number;
  providerAudience: string;
  absoluteResourceUri: string;
  listingManifestHash: string;
  providerOfferHash: string;
  categoryFamily: CategoryFamily;
  serviceType: string;
  jurisdictions: string[];
  tags: string[];
  persistentAsset: boolean;
  fulfillmentObligationHash: string;
  jurisdictionObligationHashes: Record<string, string>;
  terms: PublicServiceLegal;
  deadlinePolicy: {
    verificationSeconds: number;
    settlementEvidenceSeconds: number;
    releaseEvidenceSeconds: number;
    dispatchSeconds: number;
    fulfillmentSeconds: number;
  };
  capacityPolicy: { maxOpenOrders: number };
  providerReputation: StandardReputation;
  serviceReputation: StandardReputation;
  reputation: StandardReputation;
}

export interface StandardReputation {
  transactionCount: string;
  completedCount: string;
  failedCount: string;
  canceledCount: string;
  completionSampleSize: string;
  completionRate: number | null;
  confirmedCount: string;
  notConfirmedCount: string;
  confirmationSampleSize: string;
  buyerSatisfactionRate: number | null;
  valueWeightedBuyerSatisfactionRate: number | null;
  totalPaid: string;
  totalRefunded: string;
  averageFulfillmentSeconds: number | null;
  fulfillmentSampleSize: string;
  recentPurchases: PublicMarketplacePurchase[];
  finalizedBlock: string | null;
}

export interface PublicMarketplacePurchase {
  orderKey: string;
  txHash: string | null;
  payer: string;
  buyerAgentId: string | null;
  buyerName: string | null;
  amount: string;
  outcomeId: string;
  timestamp: string;
}

export interface PublicServiceLegal {
  marketplaceTermsUrl: string;
  marketplacePrivacyUrl: string;
  providerLegalName: string;
  providerTermsUrl: string;
  providerPrivacyUrl: string;
}

export interface PublicSkill {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | null;
  variable: boolean;
  paymentRequired: boolean;
}

export interface PublicService {
  agentId: string;
  name: string;
  providerAddress: string;
  agentURI: string | null;
  categoryFamily: CategoryFamily;
  serviceType: string;
  jurisdictions: string[];
  serviceDescription: string | null;
  serviceLifecycle: string | null;
  turnaroundEstimate: string | null;
  providerA2AUrl: string | null;
  providerName: string | null;
  providerDescription: string | null;
  providerWebsite?: string | null;
  iconUrl?: string | null;
  serviceId: string | null;
  serviceSlug: string | null;
  serviceVersion: string | null;
  legal: PublicServiceLegal;
  pricing: {
    currency: string;
    basePrice: string | null;
    pricingModel: string;
    variable: boolean;
    billingModel: string;
  };
  skills: PublicSkill[];
  standardRail: StandardOutcome;
}

export type ServiceDetail = PublicService;

export interface StandardRailMetadata {
  version: number;
  chainId: number;
  network: string;
  paymentRail: {
    scheme: string;
    network: string;
    asset: string;
    transferMethod: string;
    activeRailProfileHash: string;
    activeRailProfileUrl: string;
  };
  contracts: {
    identityRegistry: string;
    agentIndex: string;
    providerRegistry: string;
    serviceRegistry: string;
    validationRegistry: string;
    reputationStorage: string;
    eas: string;
    usdc: string;
  };
  outcomes: StandardOutcome[];
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`gateway ${path} → ${response.status}`);
  return response.json() as Promise<T>;
}


function asService(outcome: StandardOutcome, agentURI: string | null): PublicService {
  const basePrice = outcome.pricingMode === 'fixed'
    ? atomicUsdc(outcome.fixedGrossAmount)
    : null;
  return {
    agentId: outcome.providerAgentId,
    name: outcome.title,
    providerAddress: outcome.providerPayee,
    agentURI,
    categoryFamily: outcome.categoryFamily,
    serviceType: outcome.serviceType,
    jurisdictions: outcome.jurisdictions,
    serviceDescription: outcome.description,
    serviceLifecycle: 'standard-x402',
    turnaroundEstimate: `within ${formatDuration(outcome.deadlinePolicy.fulfillmentSeconds)}`,
    providerA2AUrl: outcome.providerAudience,
    providerName: outcome.terms.providerLegalName,
    providerDescription: null,
    providerWebsite: null,
    iconUrl: null,
    serviceId: outcome.serviceId,
    serviceSlug: outcome.outcomeId,
    serviceVersion: '1',
    legal: outcome.terms,
    pricing: {
      currency: 'USDC',
      basePrice,
      pricingModel: outcome.pricingMode,
      variable: outcome.pricingMode === 'dynamic',
      billingModel: 'per outcome',
    },
    skills: [{
      id: outcome.outcomeId,
      name: outcome.title,
      description: outcome.description,
      basePrice,
      variable: outcome.pricingMode === 'dynamic',
      paymentRequired: true,
    }],
    standardRail: outcome,
  };
}

export async function getServices(signal?: AbortSignal) {
  const response = parseOutcomeIndex(await fetchJson<unknown>('/public/v2/outcomes', signal));
  const agentIds = [...new Set(response.outcomes.map((outcome) => outcome.providerAgentId))];
  const agentUris = new Map(await Promise.all(agentIds.map(async (agentId) => [
    agentId,
    parseProviderAgentUri(
      await fetchJson<unknown>(`/public/v2/registry/providers/${encodeURIComponent(agentId)}`, signal),
      agentId,
    ),
  ] as const)));
  return {
    services: response.outcomes.map((outcome) => asService(
      outcome,
      agentUris.get(outcome.providerAgentId) ?? null,
    )),
    cachedAt: null,
  };
}

export async function getServiceDetail(agentId: string, outcomeId?: string | null, signal?: AbortSignal) {
  const response = await getServices(signal);
  const service = response.services.find((item) =>
    item.agentId === agentId && (!outcomeId || item.serviceSlug === outcomeId),
  );
  if (!service) throw new Error('outcome not found');
  return service;
}

export async function getRailMetadata(signal?: AbortSignal) {
  return parseRailMetadata(await fetchJson<unknown>('/.well-known/daski-chain.json', signal));
}

export function serviceKey(service: Pick<PublicService, 'agentId' | 'serviceSlug'>): string {
  return `${service.agentId}:${service.serviceSlug ?? ''}`;
}

export function servicePath(service: Pick<PublicService, 'agentId' | 'serviceSlug'>): string {
  const base = `/service/${encodeURIComponent(service.agentId)}`;
  return service.serviceSlug ? `${base}?service=${encodeURIComponent(service.serviceSlug)}` : base;
}

export function basescanAddress(address: string) {
  return `https://sepolia.basescan.org/address/${address}`;
}

export function basescanTx(hash: string) {
  return `https://sepolia.basescan.org/tx/${hash}`;
}

export function priceDisplay(service: Pick<PublicService, 'pricing'>) {
  return service.pricing.basePrice
    ? { value: service.pricing.basePrice, unit: 'USDC' }
    : { value: 'dynamic', unit: 'USDC' };
}

export function priceRange(service: Pick<PublicService, 'pricing'>): string {
  const price = priceDisplay(service);
  return `${price.value} ${price.unit}`;
}

export function serviceChips(service: PublicService): string[] {
  return service.skills
    .filter((skill) => skill.paymentRequired)
    .slice(0, 4)
    .map((skill) => skill.id);
}

export function buyerDisplay(purchase: PublicMarketplacePurchase): string {
  const name = purchase.buyerName?.trim();
  if (name) return name;
  if (purchase.buyerAgentId) return `agent#${purchase.buyerAgentId}`;
  return shortAddress(purchase.payer, 8, 6);
}

export function shortAddress(value: string, head = 8, tail = 6): string {
  return value.length > head + tail ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}

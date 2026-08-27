import { parseRailMetadata } from './railMetadata.ts';
import { atomicUsdc } from './displayFormat.ts';

export { atomicUsdc, formatDuration, reputationRate } from './displayFormat.ts';

export const GATEWAY_URL =
  (import.meta.env?.PUBLIC_GATEWAY_URL as string | undefined) ??
  'https://sandbox-gateway.daski.io';

export interface StandardOutcome {
  providerAgentId: string;
  serviceId: string;
  outcomeId: string;
  skillId: string;
  service: StandardServicePresentation;
  skill: StandardSkillPresentation;
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
  categoryFamily: string;
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

export interface StandardServicePresentation {
  id: string;
  slug: string;
  version: string;
  name: string;
  description: string;
  categoryFamily: string;
  serviceType: string;
  jurisdictions: string[];
  turnaroundEstimate: string;
  serviceLifecycle: string;
  agentCardUrl: string;
  providerA2AUrl: string;
}

export interface StandardSkillPresentation {
  id: string;
  name: string;
  description: string;
  tags: string[];
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
  safeBlock: string | null;
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
  skillId: string;
  name: string;
  description: string;
  tags: string[];
  documentationUrl: string;
  basePrice: string | null;
  fixedAmountAtomic: string | null;
  variable: boolean;
  paymentRequired: boolean;
  acceptingNewOrders: boolean;
  fulfillmentMode: 'automated' | 'human' | 'hybrid';
  assetType: string | null;
  splitterAddress: string | null;
}

export interface PublicService {
  gatewayRegistrationId: string;
  providerAgentId: string;
  serviceId: string;
  name: string;
  providerAddress: string;
  agentCardUrl: string;
  categoryFamily: string;
  serviceType: string;
  jurisdictions: string[];
  serviceDescription: string;
  serviceLifecycle: string;
  turnaroundEstimate: string;
  providerA2AUrl: string;
  providerName: string;
  serviceSlug: string;
  serviceVersion: string;
  acceptingNewOrders: boolean;
  legal: PublicServiceLegal;
  pricing: {
    currency: string;
    basePrice: string | null;
    variable: boolean;
  };
  skills: PublicSkill[];
  freshness: {
    lastValidatedAt: string | null;
    presentationStaleAfterSeconds: number;
    commerceFreshnessSeconds: number;
  };
  providerReputation: ReputationStats | null;
  serviceReputation: ReputationStats | null;
}

// On-chain reputation aggregates at a safe block. Nullable on the wire: the
// gateway degrades them to null on read failure, and the list endpoint omits
// them entirely.
export interface ReputationStats {
  completed: string;
  failed: string;
  canceled: string;
  confirmed: string;
  notConfirmed: string;
  transactions: string;
  refundedAmount: string | null;
  safeBlock: string;
}

export function reputationRates(stats: ReputationStats): {
  purchases: number;
  completionRate: number | null;
  buyerSatisfaction: number | null;
} {
  const completed = Number(stats.completed);
  const terminal = completed + Number(stats.failed) + Number(stats.canceled);
  const confirmed = Number(stats.confirmed);
  const confirmations = confirmed + Number(stats.notConfirmed);
  return {
    purchases: Number(stats.transactions),
    completionRate: terminal > 0 ? (completed / terminal) * 100 : null,
    buyerSatisfaction: confirmations > 0 ? (confirmed / confirmations) * 100 : null,
  };
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

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`gateway ${label} is not an object`);
  }
  return value as JsonRecord;
}

function text(
  value: unknown,
  label: string,
  maximum = 32_000,
): string {
  if (
    typeof value !== 'string' || value.length === 0 || value.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) throw new Error(`gateway ${label} is invalid`);
  return value;
}

function decimal(value: unknown, label: string): string {
  const found = text(value, label, 80);
  if (!/^\d+$/.test(found)) throw new Error(`gateway ${label} is invalid`);
  return found;
}

function hex(value: unknown, label: string, bytes: number): string {
  const found = text(value, label, 2 + bytes * 2);
  if (!new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`).test(found)) {
    throw new Error(`gateway ${label} is invalid`);
  }
  return found.toLowerCase();
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`gateway ${label} is invalid`);
  return value;
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`gateway ${label} is invalid`);
  }
  return Number(value);
}

function strings(value: unknown, label: string, maximum = 128): string[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new Error(`gateway ${label} is invalid`);
  }
  return value.map((item, index) => text(item, `${label}[${index}]`, 512));
}

function httpsUrl(value: unknown, label: string): string {
  const parsed = new URL(text(value, label, 2_048));
  if (
    parsed.protocol !== 'https:' || parsed.username || parsed.password ||
    parsed.hash
  ) throw new Error(`gateway ${label} is invalid`);
  return parsed.toString();
}

function nullableTimestamp(value: unknown, label: string): string | null {
  if (value === null) return null;
  const found = text(value, label, 64);
  if (!Number.isFinite(Date.parse(found))) throw new Error(`gateway ${label} is invalid`);
  return found;
}

function parseLegal(value: unknown): PublicServiceLegal {
  const legal = record(value, 'service legal metadata');
  return {
    marketplaceTermsUrl: httpsUrl(legal.marketplaceTermsUrl, 'marketplace terms URL'),
    marketplacePrivacyUrl: httpsUrl(legal.marketplacePrivacyUrl, 'marketplace privacy URL'),
    providerLegalName: text(legal.providerLegalName, 'provider legal name', 512),
    providerTermsUrl: httpsUrl(legal.providerTermsUrl, 'provider terms URL'),
    providerPrivacyUrl: httpsUrl(legal.providerPrivacyUrl, 'provider privacy URL'),
  };
}

function fixedUsdcAmount(pricingValue: unknown): string | null {
  const pricing = record(pricingValue, 'skill pricing');
  const usdc = record(pricing.USDC, 'USDC pricing');
  const amount = usdc.fixed_amount;
  return typeof amount === 'string' && /^\d+$/.test(amount) ? amount : null;
}

function parsePublicSkill(value: unknown): PublicSkill {
  const skill = record(value, 'skill');
  const presentation = record(skill.presentation, 'skill presentation');
  const contract = record(skill.contract, 'skill contract');
  const listing = record(skill.listing, 'skill listing');
  const paymentRequired = booleanValue(
    contract.paymentRequired,
    'skill paymentRequired',
  );
  const fixedAmountAtomic = fixedUsdcAmount(contract.pricing);
  const fulfillmentMode = text(
    contract.fulfillmentMode,
    'skill fulfillment mode',
    16,
  );
  if (!['automated', 'human', 'hybrid'].includes(fulfillmentMode)) {
    throw new Error('gateway skill fulfillment mode is invalid');
  }
  const assetType = contract.assetType === null
    ? null
    : text(contract.assetType, 'skill asset type', 128);
  return {
    id: text(listing.listingId, 'listing ID', 64),
    skillId: text(skill.skillId, 'skill ID', 96),
    name: text(presentation.name, 'skill name', 160),
    description: text(presentation.description, 'skill description'),
    tags: strings(presentation.tags, 'skill tags', 64),
    documentationUrl: httpsUrl(
      presentation.documentationUrl,
      'skill documentation URL',
    ),
    basePrice: fixedAmountAtomic === null ? null : atomicUsdc(fixedAmountAtomic),
    fixedAmountAtomic,
    variable: paymentRequired && fixedAmountAtomic === null,
    paymentRequired,
    acceptingNewOrders: booleanValue(
      contract.acceptingNewOrders,
      'skill acceptingNewOrders',
    ),
    fulfillmentMode: fulfillmentMode as PublicSkill['fulfillmentMode'],
    assetType,
    splitterAddress: listing.splitterAddress === null
      ? null
      : hex(listing.splitterAddress, 'splitter address', 20),
  };
}

function parseReputationStats(value: unknown, label: string): ReputationStats {
  const item = record(value, label);
  return {
    completed: decimal(item.completed, `${label} completed`),
    failed: decimal(item.failed, `${label} failed`),
    canceled: decimal(item.canceled, `${label} canceled`),
    confirmed: decimal(item.confirmed, `${label} confirmed`),
    notConfirmed: decimal(item.notConfirmed, `${label} not confirmed`),
    transactions: decimal(item.transactions, `${label} transactions`),
    refundedAmount: item.refundedAmount === undefined || item.refundedAmount === null
      ? null
      : decimal(item.refundedAmount, `${label} refunded amount`),
    safeBlock: decimal(item.safeBlock, `${label} safe block`),
  };
}

function parsePublicService(value: unknown): PublicService {
  const item = record(value, 'service');
  const service = record(item.service, 'service contract');
  const rail = record(item.standardRail, 'standard rail');
  const freshness = record(item.freshness, 'service freshness');
  if (!Array.isArray(item.skills) || item.skills.length === 0 || item.skills.length > 128) {
    throw new Error('gateway service skills are invalid');
  }
  const skills = item.skills.map(parsePublicSkill);
  const paid = skills.filter((skill) => skill.paymentRequired);
  const fixed = paid
    .map((skill) => skill.fixedAmountAtomic)
    .filter((amount): amount is string => amount !== null)
    .map(BigInt);
  const minimum = fixed.length === paid.length && fixed.length > 0
    ? fixed.reduce((left, right) => left < right ? left : right)
    : null;
  const legal = parseLegal(item.legal);
  return {
    gatewayRegistrationId: text(
      item.gatewayRegistrationId,
      'gateway registration ID',
      64,
    ),
    providerAgentId: decimal(item.providerAgentId, 'provider agent ID'),
    serviceId: hex(item.serviceId, 'service ID', 32),
    name: text(item.name, 'service name', 160),
    providerAddress: hex(item.providerPayee, 'provider payee', 20),
    agentCardUrl: httpsUrl(item.agentCardUrl, 'Agent Card URL'),
    categoryFamily: text(service.categoryFamily, 'category family', 128),
    serviceType: text(service.serviceType, 'service type', 128),
    jurisdictions: strings(service.jurisdictions, 'service jurisdictions', 64),
    serviceDescription: text(item.description, 'service description'),
    serviceLifecycle: text(service.lifecycle, 'service lifecycle', 128),
    turnaroundEstimate: text(
      service.turnaroundEstimate,
      'turnaround estimate',
      512,
    ),
    providerA2AUrl: httpsUrl(rail.origin, 'provider origin'),
    providerName: legal.providerLegalName,
    serviceSlug: text(service.slug, 'service slug', 64),
    serviceVersion: text(service.version, 'service version', 32),
    acceptingNewOrders: booleanValue(
      service.acceptingNewOrders,
      'service acceptingNewOrders',
    ),
    legal,
    pricing: {
      currency: 'USDC',
      basePrice: paid.length === 0
        ? '0'
        : minimum === null ? null : atomicUsdc(minimum.toString()),
      variable: paid.some((skill) => skill.variable),
    },
    skills,
    freshness: {
      lastValidatedAt: nullableTimestamp(
        freshness.lastValidatedAt,
        'last validated timestamp',
      ),
      presentationStaleAfterSeconds: integer(
        freshness.presentationStaleAfterSeconds,
        'presentation stale interval',
      ),
      commerceFreshnessSeconds: integer(
        freshness.commerceFreshnessSeconds,
        'commerce freshness interval',
      ),
    },
    providerReputation: item.providerReputation === undefined || item.providerReputation === null
      ? null
      : parseReputationStats(item.providerReputation, 'provider reputation'),
    serviceReputation: item.serviceReputation === undefined || item.serviceReputation === null
      ? null
      : parseReputationStats(item.serviceReputation, 'service reputation'),
  };
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`gateway ${path} → ${response.status}`);
  return response.json() as Promise<T>;
}

export function parseServiceIndex(value: unknown): { services: PublicService[] } {
  const response = record(value, 'service index');
  if (!Array.isArray(response.services) || response.services.length > 100) {
    throw new Error('gateway service index is invalid');
  }
  const services = response.services.map(parsePublicService);
  if (new Set(services.map((service) => service.serviceId)).size !== services.length) {
    throw new Error('gateway service index contains duplicate service IDs');
  }
  return { services };
}

export async function getServices(signal?: AbortSignal) {
  const response = parseServiceIndex(
    await fetchJson<unknown>('/public/v3/services?limit=100', signal),
  );
  return {
    services: response.services,
    cachedAt: response.services
      .map((service) => service.freshness.lastValidatedAt)
      .filter((value): value is string => value !== null)
      .sort()
      .at(0) ?? null,
  };
}

export async function getServiceDetail(
  serviceId: string,
  signal?: AbortSignal,
): Promise<ServiceDetail> {
  const normalized = hex(serviceId, 'service ID', 32);
  return parsePublicService(await fetchJson<unknown>(
    `/public/v3/services/${encodeURIComponent(normalized)}`,
    signal,
  ));
}

export async function getRailMetadata(signal?: AbortSignal) {
  return parseRailMetadata(
    await fetchJson<unknown>('/.well-known/daski-chain.json', signal),
  );
}

export function serviceKey(service: Pick<PublicService, 'serviceId'>): string {
  return service.serviceId;
}

export function servicePath(service: Pick<PublicService, 'serviceId'>): string {
  return `/service/${encodeURIComponent(service.serviceId)}`;
}

export function basescanAddress(address: string) {
  return `https://sepolia.basescan.org/address/${address}`;
}

export function basescanTx(hash: string) {
  return `https://sepolia.basescan.org/tx/${hash}`;
}

export function priceDisplay(service: Pick<PublicService, 'pricing' | 'skills'>) {
  const paid = service.skills.filter((skill) => skill.paymentRequired);
  if (paid.length === 0) return { value: 'free', unit: null };
  return service.pricing.basePrice !== null && !service.pricing.variable
    ? { value: service.pricing.basePrice, unit: 'USDC' }
    : { value: 'variable', unit: 'USDC' };
}

export function priceRange(service: Pick<PublicService, 'pricing' | 'skills'>): string {
  const price = priceDisplay(service);
  return price.unit ? `${price.value} ${price.unit}` : price.value;
}

export function serviceChips(service: PublicService): string[] {
  return service.skills.slice(0, 4).map((skill) => skill.skillId);
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

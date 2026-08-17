import type { StandardOutcome, StandardRailMetadata } from './api';
import {
  SERVICE_CATEGORY_FAMILIES,
  type CategoryFamily,
} from '../config/service-taxonomy.ts';

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, keys: string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has an unexpected shape`);
  }
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is invalid`);
  return value;
}

function nullableText(value: unknown, label: string): string | null {
  return value === null ? null : text(value, label);
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error(`${label} is invalid`);
  return Number(value);
}

function address(value: unknown, label: string): string {
  const found = text(value, label);
  if (!/^0x[0-9a-fA-F]{40}$/.test(found)) throw new Error(`${label} is invalid`);
  return found;
}

function hash(value: unknown, label: string): string {
  const found = text(value, label);
  if (!/^0x[0-9a-fA-F]{64}$/.test(found)) throw new Error(`${label} is invalid`);
  return found;
}

function decimal(value: unknown, label: string): string {
  const found = text(value, label);
  if (!/^(0|[1-9]\d*)$/.test(found)) throw new Error(`${label} is invalid`);
  return found;
}

function nullableRate(value: unknown, label: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function nullableInteger(value: unknown, label: string): number | null {
  if (value === null) return null;
  return integer(value, label);
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new Error(`${label} is invalid`);
  }
  return value as string[];
}

function https(value: unknown, label: string): string {
  const found = text(value, label);
  const parsed = new URL(found);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
    throw new Error(`${label} is invalid`);
  }
  return found;
}

function parseTerms(value: unknown): StandardOutcome['terms'] {
  const terms = record(value, 'outcome terms');
  exact(terms, [
    'marketplaceTermsUrl', 'marketplacePrivacyUrl', 'providerLegalName',
    'providerTermsUrl', 'providerPrivacyUrl',
  ], 'outcome terms');
  return {
    marketplaceTermsUrl: https(terms.marketplaceTermsUrl, 'marketplace terms URL'),
    marketplacePrivacyUrl: https(terms.marketplacePrivacyUrl, 'marketplace privacy URL'),
    providerLegalName: text(terms.providerLegalName, 'provider legal name'),
    providerTermsUrl: https(terms.providerTermsUrl, 'provider terms URL'),
    providerPrivacyUrl: https(terms.providerPrivacyUrl, 'provider privacy URL'),
  };
}

function parseReputation(value: unknown, label: string): StandardOutcome['reputation'] {
  const reputation = record(value, label);
  exact(reputation, [
    'transactionCount', 'completedCount', 'failedCount', 'canceledCount',
    'completionSampleSize', 'completionRate', 'confirmedCount', 'notConfirmedCount',
    'confirmationSampleSize', 'buyerSatisfactionRate',
    'valueWeightedBuyerSatisfactionRate', 'totalPaid', 'totalRefunded',
    'averageFulfillmentSeconds', 'fulfillmentSampleSize', 'recentPurchases',
    'finalizedBlock',
  ], label);
  if (!Array.isArray(reputation.recentPurchases)) {
    throw new Error(`${label} recent purchases are invalid`);
  }
  const recentPurchases = reputation.recentPurchases.map((value, index) => {
    const purchase = record(value, `${label} recent purchase ${index}`);
    exact(purchase, [
      'orderKey', 'txHash', 'payer', 'buyerAgentId', 'buyerName',
      'amount', 'outcomeId', 'timestamp',
    ], `${label} recent purchase ${index}`);
    const timestamp = text(purchase.timestamp, 'purchase timestamp');
    if (Number.isNaN(Date.parse(timestamp))) throw new Error('purchase timestamp is invalid');
    const buyerAgentId = nullableText(purchase.buyerAgentId, 'buyer agent ID');
    if (buyerAgentId !== null && !/^(0|[1-9]\d*)$/.test(buyerAgentId)) {
      throw new Error('buyer agent ID is invalid');
    }
    return {
      orderKey: hash(purchase.orderKey, 'purchase order key'),
      txHash: purchase.txHash === null ? null : hash(purchase.txHash, 'purchase transaction hash'),
      payer: address(purchase.payer, 'purchase payer'),
      buyerAgentId,
      buyerName: nullableText(purchase.buyerName, 'buyer name'),
      amount: decimal(purchase.amount, 'purchase amount'),
      outcomeId: text(purchase.outcomeId, 'purchase outcome ID'),
      timestamp,
    };
  });
  return {
    transactionCount: decimal(reputation.transactionCount, 'transaction count'),
    completedCount: decimal(reputation.completedCount, 'completed count'),
    failedCount: decimal(reputation.failedCount, 'failed count'),
    canceledCount: decimal(reputation.canceledCount, 'canceled count'),
    completionSampleSize: decimal(reputation.completionSampleSize, 'completion sample size'),
    completionRate: nullableRate(reputation.completionRate, 'completion rate'),
    confirmedCount: decimal(reputation.confirmedCount, 'confirmed count'),
    notConfirmedCount: decimal(reputation.notConfirmedCount, 'not-confirmed count'),
    confirmationSampleSize: decimal(reputation.confirmationSampleSize, 'confirmation sample size'),
    buyerSatisfactionRate: nullableRate(reputation.buyerSatisfactionRate, 'buyer satisfaction rate'),
    valueWeightedBuyerSatisfactionRate: nullableRate(
      reputation.valueWeightedBuyerSatisfactionRate,
      'value-weighted buyer satisfaction rate',
    ),
    totalPaid: decimal(reputation.totalPaid, 'total paid'),
    totalRefunded: decimal(reputation.totalRefunded, 'total refunded'),
    averageFulfillmentSeconds: nullableInteger(
      reputation.averageFulfillmentSeconds,
      'average fulfillment seconds',
    ),
    fulfillmentSampleSize: decimal(reputation.fulfillmentSampleSize, 'fulfillment sample size'),
    recentPurchases,
    finalizedBlock: reputation.finalizedBlock === null
      ? null
      : decimal(reputation.finalizedBlock, 'finalized block'),
  };
}

function parseOutcome(value: unknown): StandardOutcome {
  const outcome = record(value, 'standard outcome');
  exact(outcome, [
    'providerAgentId', 'serviceId', 'outcomeId', 'title', 'description', 'bindingProfile',
    'pricingMode', 'fixedGrossAmount', 'token', 'payTo', 'providerPayee',
    'daskiCommissionReceiver', 'commissionBps', 'providerAudience',
    'absoluteResourceUri', 'listingManifestHash', 'providerOfferHash', 'terms',
    'deadlinePolicy', 'capacityPolicy', 'splitterDeploymentBlockNumber',
    'categoryFamily', 'serviceType', 'jurisdictions', 'tags', 'persistentAsset',
    'fulfillmentObligationHash', 'jurisdictionObligationHashes',
    'providerReputation', 'serviceReputation', 'reputation',
  ], 'standard outcome');
  if (!['stock-fixed-v1', 'recipe-bound-v1'].includes(String(outcome.bindingProfile))) {
    throw new Error('outcome binding profile is invalid');
  }
  if (!['fixed', 'dynamic'].includes(String(outcome.pricingMode))) {
    throw new Error('outcome pricing mode is invalid');
  }
  if (!/^\d+$/.test(String(outcome.fixedGrossAmount)) ||
      !/^\d+$/.test(String(outcome.splitterDeploymentBlockNumber))) {
    throw new Error('outcome atomic or block value is invalid');
  }
  const deadline = record(outcome.deadlinePolicy, 'deadline policy');
  exact(deadline, [
    'draftSeconds', 'minimumPaymentWindowSeconds', 'verificationSeconds',
    'settlementEvidenceSeconds', 'releaseEvidenceSeconds', 'dispatchSeconds',
    'fulfillmentSeconds',
  ], 'deadline policy');
  const capacity = record(outcome.capacityPolicy, 'capacity policy');
  exact(capacity, ['maxOpenOrders'], 'capacity policy');
  const commissionBps = integer(outcome.commissionBps, 'commission BPS');
  const maxOpenOrders = integer(capacity.maxOpenOrders, 'open-order capacity');
  const deadlinePolicy = {
    verificationSeconds: integer(deadline.verificationSeconds, 'verification deadline'),
    settlementEvidenceSeconds: integer(deadline.settlementEvidenceSeconds, 'settlement deadline'),
    releaseEvidenceSeconds: integer(deadline.releaseEvidenceSeconds, 'release deadline'),
    dispatchSeconds: integer(deadline.dispatchSeconds, 'dispatch deadline'),
    fulfillmentSeconds: integer(deadline.fulfillmentSeconds, 'fulfillment deadline'),
  };
  if (
    commissionBps <= 0 || commissionBps >= 10_000 || maxOpenOrders <= 0 ||
    Object.values(deadlinePolicy).some((seconds) => seconds < 30)
  ) {
    throw new Error('outcome economics or capacity is invalid');
  }
  const fixedGrossAmount = String(outcome.fixedGrossAmount);
  if (
    (outcome.pricingMode === 'fixed' && BigInt(fixedGrossAmount) <= 0n) ||
    (outcome.pricingMode === 'dynamic' && fixedGrossAmount !== '0')
  ) throw new Error('outcome price is inconsistent with its mode');
  const categoryFamily = text(outcome.categoryFamily, 'category family');
  if (!SERVICE_CATEGORY_FAMILIES.some((family) => family.slug === categoryFamily)) {
    throw new Error('category family is invalid');
  }
  const jurisdictions = stringArray(outcome.jurisdictions, 'jurisdictions');
  const jurisdictionHashes = record(
    outcome.jurisdictionObligationHashes,
    'jurisdiction obligation hashes',
  );
  exact(jurisdictionHashes, jurisdictions, 'jurisdiction obligation hashes');
  const parsedJurisdictionHashes = Object.fromEntries(
    jurisdictions.map((jurisdiction) => [
      jurisdiction,
      hash(jurisdictionHashes[jurisdiction], `jurisdiction obligation hash ${jurisdiction}`),
    ]),
  );
  if (typeof outcome.persistentAsset !== 'boolean') throw new Error('persistent asset is invalid');
  return {
    providerAgentId: text(outcome.providerAgentId, 'provider agent ID'),
    serviceId: hash(outcome.serviceId, 'service ID'),
    outcomeId: text(outcome.outcomeId, 'outcome ID'),
    title: text(outcome.title, 'outcome title'),
    description: text(outcome.description, 'outcome description'),
    bindingProfile: outcome.bindingProfile as StandardOutcome['bindingProfile'],
    pricingMode: outcome.pricingMode as StandardOutcome['pricingMode'],
    fixedGrossAmount,
    token: address(outcome.token, 'canonical token'),
    payTo: address(outcome.payTo, 'splitter'),
    providerPayee: address(outcome.providerPayee, 'provider payee'),
    daskiCommissionReceiver: address(outcome.daskiCommissionReceiver, 'commission receiver'),
    commissionBps,
    providerAudience: https(outcome.providerAudience, 'provider audience'),
    absoluteResourceUri: https(outcome.absoluteResourceUri, 'resource URI'),
    listingManifestHash: hash(outcome.listingManifestHash, 'listing manifest hash'),
    providerOfferHash: hash(outcome.providerOfferHash, 'provider offer hash'),
    categoryFamily: categoryFamily as CategoryFamily,
    serviceType: text(outcome.serviceType, 'service type'),
    jurisdictions,
    tags: stringArray(outcome.tags, 'tags'),
    persistentAsset: outcome.persistentAsset,
    fulfillmentObligationHash: hash(
      outcome.fulfillmentObligationHash,
      'fulfillment obligation hash',
    ),
    jurisdictionObligationHashes: parsedJurisdictionHashes,
    splitterDeploymentBlockNumber: String(outcome.splitterDeploymentBlockNumber),
    terms: parseTerms(outcome.terms),
    deadlinePolicy,
    capacityPolicy: { maxOpenOrders },
    providerReputation: parseReputation(outcome.providerReputation, 'provider reputation'),
    serviceReputation: parseReputation(outcome.serviceReputation, 'service reputation'),
    reputation: parseReputation(outcome.reputation, 'outcome reputation'),
  };
}

export function parseOutcomeIndex(value: unknown): { version: number; outcomes: StandardOutcome[] } {
  const index = record(value, 'outcome index');
  exact(index, ['version', 'outcomes'], 'outcome index');
  if (index.version !== 2 || !Array.isArray(index.outcomes)) throw new Error('outcome index is invalid');
  return { version: 2, outcomes: index.outcomes.map(parseOutcome) };
}

export function parseProviderAgentUri(value: unknown, expectedAgentId: string): string | null {
  const provider = record(value, 'provider registration');
  if (text(provider.agentId, 'provider agent ID') !== expectedAgentId) {
    throw new Error('provider registration agent ID does not match');
  }
  const identity = record(provider.identity, 'provider identity');
  return identity.agentUri === '' ? null : https(identity.agentUri, 'provider agent URI');
}

export function parseRailMetadata(value: unknown): StandardRailMetadata {
  const metadata = record(value, 'rail metadata');
  exact(metadata, [
    'version', 'chainId', 'network', 'paymentRail', 'contracts', 'outcomes',
  ], 'rail metadata');
  if (metadata.version !== 2 || !Array.isArray(metadata.outcomes)) throw new Error('rail metadata is invalid');
  const rail = record(metadata.paymentRail, 'payment rail');
  exact(rail, [
    'scheme', 'network', 'asset', 'transferMethod', 'activeRailProfileHash',
    'activeRailProfileUrl',
  ], 'payment rail');
  const chainId = integer(metadata.chainId, 'chain ID');
  if (chainId <= 0 || rail.scheme !== 'exact' || rail.network !== `eip155:${chainId}` ||
      rail.transferMethod !== 'eip3009') {
    throw new Error('payment rail identity is invalid');
  }
  const asset = address(rail.asset, 'payment asset');
  const contracts = record(metadata.contracts, 'contracts');
  exact(contracts, [
    'identityRegistry', 'agentIndex', 'providerRegistry', 'serviceRegistry',
    'validationRegistry', 'reputationStorage', 'eas', 'usdc',
  ], 'contracts');
  const parsedContracts = {
    identityRegistry: address(contracts.identityRegistry, 'identity registry'),
    agentIndex: address(contracts.agentIndex, 'agent index'),
    providerRegistry: address(contracts.providerRegistry, 'provider registry'),
    serviceRegistry: address(contracts.serviceRegistry, 'service registry'),
    validationRegistry: address(contracts.validationRegistry, 'validation registry'),
    reputationStorage: address(contracts.reputationStorage, 'reputation storage'),
    eas: address(contracts.eas, 'EAS'),
    usdc: address(contracts.usdc, 'USDC'),
  };
  if (parsedContracts.usdc.toLowerCase() !== asset.toLowerCase()) {
    throw new Error('contract USDC differs from the canonical payment asset');
  }
  const outcomes = metadata.outcomes.map(parseOutcome);
  if (outcomes.some((outcome) => outcome.token.toLowerCase() !== asset.toLowerCase())) {
    throw new Error('outcome token differs from the canonical payment asset');
  }
  return {
    version: 2,
    chainId,
    network: text(metadata.network, 'network'),
    paymentRail: {
      scheme: text(rail.scheme, 'payment scheme'),
      network: text(rail.network, 'payment network'),
      asset,
      transferMethod: text(rail.transferMethod, 'transfer method'),
      activeRailProfileHash: hash(rail.activeRailProfileHash, 'active rail profile'),
      activeRailProfileUrl: https(rail.activeRailProfileUrl, 'active rail profile URL'),
    },
    contracts: parsedContracts,
    outcomes,
  };
}

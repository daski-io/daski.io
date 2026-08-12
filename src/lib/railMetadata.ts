import type { StandardOutcome, StandardRailMetadata } from './api';

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

function parseOutcome(value: unknown): StandardOutcome {
  const outcome = record(value, 'standard outcome');
  exact(outcome, [
    'providerAgentId', 'outcomeId', 'title', 'description', 'bindingProfile',
    'pricingMode', 'fixedGrossAmount', 'token', 'payTo', 'providerPayee',
    'daskiCommissionReceiver', 'commissionBps', 'providerAudience',
    'absoluteResourceUri', 'listingManifestHash', 'providerOfferHash', 'terms',
    'refundPolicy', 'deadlinePolicy', 'capacityPolicy', 'splitterDeploymentBlockNumber',
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
  const refund = record(outcome.refundPolicy, 'refund policy');
  exact(refund, [
    'buyerRequested', 'requestDeadlineSeconds', 'executionReserveAddress',
    'releaseFailureDisposition', 'providerFailureDisposition',
    'dispatchAmbiguityDisposition', 'kycFailureDisposition',
  ], 'refund policy');
  if (typeof refund.buyerRequested !== 'boolean') throw new Error('refund policy is invalid');
  if (
    refund.releaseFailureDisposition !== 'legal_hold' ||
    refund.providerFailureDisposition !== 'refund_due' ||
    refund.dispatchAmbiguityDisposition !== 'refund_due' ||
    refund.kycFailureDisposition !== 'refund_due'
  ) throw new Error('refund disposition is invalid');
  const deadline = record(outcome.deadlinePolicy, 'deadline policy');
  exact(deadline, [
    'draftSeconds', 'minimumPaymentWindowSeconds', 'verificationSeconds',
    'settlementEvidenceSeconds', 'releaseEvidenceSeconds', 'dispatchSeconds',
    'fulfillmentSeconds', 'refundSeconds',
  ], 'deadline policy');
  const capacity = record(outcome.capacityPolicy, 'capacity policy');
  exact(capacity, ['maxOpenOrders'], 'capacity policy');
  const commissionBps = integer(outcome.commissionBps, 'commission BPS');
  const maxOpenOrders = integer(capacity.maxOpenOrders, 'open-order capacity');
  const requestDeadlineSeconds = integer(refund.requestDeadlineSeconds, 'refund deadline');
  const deadlinePolicy = {
    verificationSeconds: integer(deadline.verificationSeconds, 'verification deadline'),
    settlementEvidenceSeconds: integer(deadline.settlementEvidenceSeconds, 'settlement deadline'),
    releaseEvidenceSeconds: integer(deadline.releaseEvidenceSeconds, 'release deadline'),
    dispatchSeconds: integer(deadline.dispatchSeconds, 'dispatch deadline'),
    fulfillmentSeconds: integer(deadline.fulfillmentSeconds, 'fulfillment deadline'),
    refundSeconds: integer(deadline.refundSeconds, 'refund execution deadline'),
  };
  if (
    commissionBps <= 0 || commissionBps >= 10_000 || maxOpenOrders <= 0 ||
    requestDeadlineSeconds < 30 || Object.values(deadlinePolicy).some((seconds) => seconds < 30)
  ) {
    throw new Error('outcome economics or capacity is invalid');
  }
  const fixedGrossAmount = String(outcome.fixedGrossAmount);
  if (
    (outcome.pricingMode === 'fixed' && BigInt(fixedGrossAmount) <= 0n) ||
    (outcome.pricingMode === 'dynamic' && fixedGrossAmount !== '0')
  ) throw new Error('outcome price is inconsistent with its mode');
  return {
    providerAgentId: text(outcome.providerAgentId, 'provider agent ID'),
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
    splitterDeploymentBlockNumber: String(outcome.splitterDeploymentBlockNumber),
    terms: parseTerms(outcome.terms),
    refundPolicy: {
      buyerRequested: refund.buyerRequested,
      requestDeadlineSeconds,
      executionReserveAddress: address(refund.executionReserveAddress, 'refund reserve'),
    },
    deadlinePolicy,
    capacityPolicy: { maxOpenOrders },
  };
}

export function parseOutcomeIndex(value: unknown): { version: number; outcomes: StandardOutcome[] } {
  const index = record(value, 'outcome index');
  exact(index, ['version', 'outcomes'], 'outcome index');
  if (index.version !== 2 || !Array.isArray(index.outcomes)) throw new Error('outcome index is invalid');
  return { version: 2, outcomes: index.outcomes.map(parseOutcome) };
}

export function parseRailMetadata(value: unknown): StandardRailMetadata {
  const metadata = record(value, 'rail metadata');
  exact(metadata, ['version', 'chainId', 'network', 'paymentRail', 'outcomes'], 'rail metadata');
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
    outcomes,
  };
}

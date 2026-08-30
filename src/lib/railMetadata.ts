import type { StandardOutcome, StandardRailMetadata } from './api';

const reportedUnknownShapes = new Set<string>();

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function shape(
  value: Record<string, unknown>,
  required: readonly string[],
  label: string,
  optional: readonly string[] = [],
): void {
  const missing = required.filter((key) => !Object.hasOwn(value, key));
  if (missing.length > 0) {
    throw new Error(`${label} is missing required fields: ${missing.join(', ')}`);
  }
  const known = new Set([...required, ...optional]);
  const unknown = Object.keys(value).filter((key) => !known.has(key)).sort();
  if (unknown.length === 0) return;
  const fingerprint = `${label}:${unknown.join(',')}`;
  if (reportedUnknownShapes.has(fingerprint)) return;
  reportedUnknownShapes.add(fingerprint);
  console.warn(`[daski-chain] ${label} ignored unknown fields: ${unknown.join(', ')}`);
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

function https(value: unknown, label: string): string {
  const found = text(value, label);
  const parsed = new URL(found);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
    throw new Error(`${label} is invalid`);
  }
  return found;
}

function parseServicePresentation(value: unknown): StandardOutcome['service'] {
  const service = record(value, 'provider service presentation');
  shape(service, ['id', 'name'], 'provider service presentation', [
    'slug', 'version', 'description', 'categoryFamily', 'serviceType',
    'jurisdictions', 'turnaroundEstimate', 'serviceLifecycle', 'agentCardUrl',
    'providerA2AUrl',
  ]);
  return {
    id: hash(service.id, 'provider service ID'),
    name: text(service.name, 'provider service name'),
  };
}

function parseSkillPresentation(value: unknown): StandardOutcome['skill'] {
  const skill = record(value, 'provider skill presentation');
  shape(skill, ['id', 'name'], 'provider skill presentation', ['description', 'tags']);
  return {
    id: text(skill.id, 'provider skill ID'),
    name: text(skill.name, 'provider skill name'),
  };
}

function parseReputation(value: unknown, label: string): StandardOutcome['serviceReputation'] {
  const reputation = record(value, label);
  shape(reputation, [
    'transactionCount', 'completedCount', 'failedCount', 'canceledCount',
    'completionSampleSize', 'completionRate', 'confirmedCount', 'notConfirmedCount',
    'confirmationSampleSize', 'buyerSatisfactionRate',
    'valueWeightedBuyerSatisfactionRate', 'totalPaid', 'totalRefunded',
    'averageFulfillmentSeconds', 'fulfillmentSampleSize', 'recentPurchases',
    'safeBlock',
  ], label);
  if (!Array.isArray(reputation.recentPurchases)) {
    throw new Error(`${label} recent purchases are invalid`);
  }
  const recentPurchases = reputation.recentPurchases.map((value, index) => {
    const purchaseLabel = `${label} recent purchase ${index}`;
    const purchase = record(value, purchaseLabel);
    shape(purchase, [
      'orderKey', 'txHash', 'payer', 'buyerAgentId', 'buyerName',
      'amount', 'outcomeId', 'timestamp',
    ], purchaseLabel);
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
    safeBlock: reputation.safeBlock === null
      ? null
      : decimal(reputation.safeBlock, 'safe block'),
  };
}

function parseOutcome(value: unknown): StandardOutcome {
  const outcome = record(value, 'standard outcome');
  shape(outcome, [
    'providerAgentId', 'serviceId', 'outcomeId', 'skillId', 'service', 'skill',
    'providerReputation', 'serviceReputation',
  ], 'standard outcome', [
    'bindingProfile', 'pricingMode', 'fixedGrossAmount', 'token', 'payTo',
    'providerPayee', 'daskiCommissionReceiver', 'commissionBps', 'providerAudience',
    'absoluteResourceUri', 'listingManifestHash', 'providerOfferHash',
    'runtimeCommitmentHash', 'providerIntentHash', 'splitter',
    'splitterDeploymentBlockNumber', 'categoryFamily', 'serviceType',
    'jurisdictions', 'tags', 'persistentAsset', 'fulfillmentObligationHash',
    'jurisdictionObligationHashes', 'terms', 'deadlinePolicy', 'capacityPolicy',
  ]);
  const providerAgentId = decimal(outcome.providerAgentId, 'provider agent ID');
  const serviceId = hash(outcome.serviceId, 'service ID');
  const outcomeId = text(outcome.outcomeId, 'outcome ID');
  const skillId = text(outcome.skillId, 'skill ID');
  const service = parseServicePresentation(outcome.service);
  const skill = parseSkillPresentation(outcome.skill);
  if (service.id.toLowerCase() !== serviceId.toLowerCase() || skill.id !== skillId) {
    throw new Error('provider presentation does not match the admitted outcome');
  }
  return {
    providerAgentId,
    serviceId,
    outcomeId,
    skillId,
    service,
    skill,
    providerReputation: parseReputation(outcome.providerReputation, 'provider reputation'),
    serviceReputation: parseReputation(outcome.serviceReputation, 'service reputation'),
  };
}

export function parseOutcomeIndex(value: unknown): { version: number; outcomes: StandardOutcome[] } {
  const index = record(value, 'outcome index');
  shape(index, ['version', 'outcomes'], 'outcome index', ['outcomeSchemaVersion']);
  if (index.version !== 2 || !Array.isArray(index.outcomes)) {
    throw new Error('outcome index is invalid');
  }
  return { version: 2, outcomes: index.outcomes.map(parseOutcome) };
}

export function parseProviderAgentUri(value: unknown, expectedAgentId: string): string | null {
  const provider = record(value, 'provider registration');
  shape(provider, ['agentId', 'identity'], 'provider registration');
  if (text(provider.agentId, 'provider agent ID') !== expectedAgentId) {
    throw new Error('provider registration agent ID does not match');
  }
  const identity = record(provider.identity, 'provider identity');
  return identity.agentUri === '' ? null : https(identity.agentUri, 'provider agent URI');
}

export function parseRailMetadata(value: unknown): StandardRailMetadata {
  const metadata = record(value, 'rail metadata');
  shape(metadata, [
    'version', 'chainId', 'network', 'paymentRail', 'contracts', 'outcomes',
  ], 'rail metadata', ['outcomeSchemaVersion']);
  const version = integer(metadata.version, 'rail metadata version');
  if ((version !== 2 && version !== 3) || !Array.isArray(metadata.outcomes)) {
    throw new Error('rail metadata is invalid');
  }
  const outcomeSchemaVersion = metadata.outcomeSchemaVersion === undefined
    ? null
    : integer(metadata.outcomeSchemaVersion, 'outcome schema version');
  if ((version === 3 && outcomeSchemaVersion !== 1) ||
      (version === 2 && outcomeSchemaVersion !== null && outcomeSchemaVersion !== 1)) {
    throw new Error('outcome schema version is invalid');
  }
  const rail = record(metadata.paymentRail, 'payment rail');
  shape(rail, [
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
  shape(contracts, [
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
  return {
    version: version as 2 | 3,
    outcomeSchemaVersion: outcomeSchemaVersion as 1 | null,
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
    outcomes: metadata.outcomes.map(parseOutcome),
  };
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOutcomeIndex, parseRailMetadata } from '../src/lib/railMetadata.ts';

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

function validReputation(overrides = {}) {
  return {
    transactionCount: '2',
    completedCount: '1',
    failedCount: '1',
    canceledCount: '0',
    completionSampleSize: '2',
    completionRate: 50,
    confirmedCount: '1',
    notConfirmedCount: '0',
    confirmationSampleSize: '1',
    buyerSatisfactionRate: 100,
    valueWeightedBuyerSatisfactionRate: 100,
    totalPaid: '9007199254740993000000',
    totalRefunded: '5000000',
    averageFulfillmentSeconds: 90,
    fulfillmentSampleSize: '1',
    recentPurchases: [{ amount: '5000000', timestamp: '2026-08-13T12:00:00.000Z' }],
    finalizedBlock: '12345690',
    ...overrides,
  };
}

function validOutcome(overrides = {}) {
  return {
    providerAgentId: '11',
    serviceId: `0x${'12'.repeat(32)}`,
    outcomeId: 'domain-registration',
    title: 'Domain registration',
    description: 'Registers one domain for a year.',
    bindingProfile: 'stock-fixed-v1',
    pricingMode: 'fixed',
    fixedGrossAmount: '5000000',
    token: USDC,
    payTo: '0x1111111111111111111111111111111111111111',
    providerPayee: '0x2222222222222222222222222222222222222222',
    daskiCommissionReceiver: '0x3333333333333333333333333333333333333333',
    commissionBps: 500,
    providerAudience: 'https://provider.example/audience',
    absoluteResourceUri: 'https://gateway.example/outcomes/11/domain-registration',
    listingManifestHash: `0x${'ab'.repeat(32)}`,
    providerOfferHash: `0x${'cd'.repeat(32)}`,
    splitterDeploymentBlockNumber: '12345678',
    categoryFamily: 'domains-web',
    serviceType: 'domain-registration',
    jurisdictions: ['US-CO'],
    tags: ['domain', 'registration'],
    persistentAsset: true,
    fulfillmentObligationHash: `0x${'34'.repeat(32)}`,
    jurisdictionObligationHashes: { 'US-CO': `0x${'56'.repeat(32)}` },
    terms: {
      marketplaceTermsUrl: 'https://daski.example/terms-of-use',
      marketplacePrivacyUrl: 'https://daski.example/privacy-policy',
      providerLegalName: 'Example Provider LLC',
      providerTermsUrl: 'https://provider.example/terms-of-use',
      providerPrivacyUrl: 'https://provider.example/privacy-policy',
    },
    deadlinePolicy: {
      draftSeconds: 600,
      minimumPaymentWindowSeconds: 120,
      verificationSeconds: 300,
      settlementEvidenceSeconds: 600,
      releaseEvidenceSeconds: 600,
      dispatchSeconds: 900,
      fulfillmentSeconds: 172800,
    },
    capacityPolicy: { maxOpenOrders: 5 },
    providerReputation: validReputation(),
    serviceReputation: validReputation(),
    reputation: validReputation(),
    ...overrides,
  };
}

function validMetadata(outcomes = [validOutcome()]) {
  return {
    version: 2,
    chainId: 84532,
    network: 'base-sepolia',
    paymentRail: {
      scheme: 'exact',
      network: 'eip155:84532',
      asset: USDC,
      transferMethod: 'eip3009',
      activeRailProfileHash: `0x${'ef'.repeat(32)}`,
      activeRailProfileUrl: 'https://gateway.example/public/v2/artifacts/profile',
    },
    outcomes,
  };
}

test('admits a fully valid rail metadata document', () => {
  const parsed = parseRailMetadata(validMetadata([
    validOutcome(),
    validOutcome({
      outcomeId: 'llc-formation',
      bindingProfile: 'recipe-bound-v1',
      pricingMode: 'dynamic',
      fixedGrossAmount: '0',
    }),
  ]));
  assert.equal(parsed.version, 2);
  assert.equal(parsed.chainId, 84532);
  assert.equal(parsed.paymentRail.asset, USDC);
  assert.equal(parsed.outcomes.length, 2);
  assert.equal(parsed.outcomes[0].bindingProfile, 'stock-fixed-v1');
  assert.equal(parsed.outcomes[0].commissionBps, 500);
  assert.equal(parsed.outcomes[0].serviceId, `0x${'12'.repeat(32)}`);
  assert.equal(parsed.outcomes[0].reputation.transactionCount, '2');
  assert.equal(parsed.outcomes[0].reputation.totalPaid, '9007199254740993000000');
  assert.equal(parsed.outcomes[1].pricingMode, 'dynamic');
  assert.equal(parsed.outcomes[1].fixedGrossAmount, '0');
});

test('preserves no-signal reputation and rejects malformed samples', () => {
  const noSignal = validReputation({
    transactionCount: '0', completedCount: '0', failedCount: '0',
    completionSampleSize: '0', completionRate: null, confirmedCount: '0',
    confirmationSampleSize: '0', buyerSatisfactionRate: null,
    valueWeightedBuyerSatisfactionRate: null, averageFulfillmentSeconds: null,
    fulfillmentSampleSize: '0', recentPurchases: [], finalizedBlock: null,
  });
  const parsed = parseOutcomeIndex({
    version: 2,
    outcomes: [validOutcome({ reputation: noSignal })],
  });
  assert.equal(parsed.outcomes[0].reputation.completionRate, null);
  assert.equal(parsed.outcomes[0].reputation.finalizedBlock, null);
  assert.throws(() => parseOutcomeIndex({
    version: 2,
    outcomes: [validOutcome({
      reputation: validReputation({ completionRate: 101 }),
    })],
  }), /completion rate is invalid/);
});

test('admits a valid outcome index and rejects cross-asset outcomes', () => {
  const index = parseOutcomeIndex({ version: 2, outcomes: [validOutcome()] });
  assert.equal(index.outcomes[0].outcomeId, 'domain-registration');
  assert.throws(() => parseRailMetadata(validMetadata([
    validOutcome({ token: '0x5555555555555555555555555555555555555555' }),
  ])), /differs from the canonical payment asset/);
});

test('fails closed on malformed live rail metadata', () => {
  assert.throws(() => parseRailMetadata({
    version: 2,
    chainId: 84532,
    network: 'base-sepolia',
    paymentRail: true,
    outcomes: [],
  }), /payment rail must be an object/);
  assert.throws(() => parseRailMetadata({
    version: 2,
    chainId: 84532,
    network: 'base-sepolia',
    paymentRail: {},
    outcomes: [],
    injected: true,
  }), /unexpected shape/);
});

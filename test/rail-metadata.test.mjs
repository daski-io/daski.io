import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOutcomeIndex, parseRailMetadata } from '../src/lib/railMetadata.ts';

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

function validOutcome(overrides = {}) {
  return {
    providerAgentId: '11',
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
    commissionBps: 250,
    providerAudience: 'https://provider.example/audience',
    absoluteResourceUri: 'https://gateway.example/outcomes/11/domain-registration',
    listingManifestHash: `0x${'ab'.repeat(32)}`,
    providerOfferHash: `0x${'cd'.repeat(32)}`,
    splitterDeploymentBlockNumber: '12345678',
    terms: {
      marketplaceTermsUrl: 'https://daski.example/terms-of-use',
      marketplacePrivacyUrl: 'https://daski.example/privacy-policy',
      providerLegalName: 'Example Provider LLC',
      providerTermsUrl: 'https://provider.example/terms-of-use',
      providerPrivacyUrl: 'https://provider.example/privacy-policy',
    },
    refundPolicy: {
      buyerRequested: true,
      requestDeadlineSeconds: 86400,
      executionReserveAddress: '0x4444444444444444444444444444444444444444',
      releaseFailureDisposition: 'legal_hold',
      providerFailureDisposition: 'refund_due',
      dispatchAmbiguityDisposition: 'refund_due',
      kycFailureDisposition: 'refund_due',
    },
    deadlinePolicy: {
      draftSeconds: 600,
      minimumPaymentWindowSeconds: 120,
      verificationSeconds: 300,
      settlementEvidenceSeconds: 600,
      releaseEvidenceSeconds: 600,
      dispatchSeconds: 900,
      fulfillmentSeconds: 172800,
      refundSeconds: 86400,
    },
    capacityPolicy: { maxOpenOrders: 5 },
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
  assert.equal(parsed.outcomes[0].commissionBps, 250);
  assert.deepEqual(parsed.outcomes[0].refundPolicy, {
    buyerRequested: true,
    requestDeadlineSeconds: 86400,
    executionReserveAddress: '0x4444444444444444444444444444444444444444',
  });
  assert.equal(parsed.outcomes[1].pricingMode, 'dynamic');
  assert.equal(parsed.outcomes[1].fixedGrossAmount, '0');
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

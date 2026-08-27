import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseServiceIndex,
  priceRange,
  servicePath,
} from '../src/lib/api.ts';

const service = {
  gatewayRegistrationId: '4ce2f9c8-2980-49ad-a919-3e0acf1ea4e7',
  providerAgentId: '41',
  serviceId: `0x${'ab'.repeat(32)}`,
  agentCardUrl: 'https://provider.example/agent-cards/lab-analysis.json',
  providerPayee: `0x${'12'.repeat(20)}`,
  legal: {
    marketplaceTermsUrl: 'https://daski.example/terms',
    marketplacePrivacyUrl: 'https://daski.example/privacy',
    providerLegalName: 'Example Research LLC',
    providerTermsUrl: 'https://provider.example/terms',
    providerPrivacyUrl: 'https://provider.example/privacy',
  },
  name: 'Laboratory Analysis',
  description: 'Independent laboratory analysis for submitted samples.',
  service: {
    serviceId: `0x${'ab'.repeat(32)}`,
    slug: 'lab-analysis',
    version: '1',
    categoryFamily: 'scientific-services',
    serviceType: 'laboratory-analysis',
    jurisdictions: ['US'],
    lifecycle: 'active',
    turnaroundEstimate: '3-5 business days',
    acceptingNewOrders: true,
  },
  standardRail: {
    origin: 'https://provider.example/',
    providerAudience: 'https://provider.example',
    quoteUrl: 'https://provider.example/standard-rail/quote',
    dispatchUrl: 'https://provider.example/standard-rail/dispatch',
    dispatchStatusUrl: 'https://provider.example/standard-rail/status',
    lifecycleUrl: 'https://provider.example/standard-rail/lifecycle',
    assetQueryUrl: 'https://provider.example/standard-rail/assets',
    assetActionUrl: 'https://provider.example/standard-rail/actions',
  },
  skills: [{
    skillId: 'analyze-sample',
    skillContractHash: `0x${'cd'.repeat(32)}`,
    presentation: {
      name: 'Analyze sample',
      description: 'Analyze one submitted sample.',
      examples: [],
      tags: ['laboratory'],
      documentationUrl: 'https://provider.example/docs/analyze-sample',
    },
    contract: {
      inputSchema: { type: 'object' },
      resultSchema: { type: 'object' },
      pricing: { USDC: { fixed_amount: '2500000' } },
      paymentRequired: true,
      requiresAssetOwnership: false,
      assetType: null,
      fulfillmentMode: 'human',
      acceptingNewOrders: true,
      capacity: { maxOpenOrders: 4 },
      deadlines: {},
      assetAction: null,
    },
    listing: {
      listingId: 'listing-lab-analysis',
      listingKey: `0x${'ef'.repeat(32)}`,
      paymentRequired: true,
      splitterAddress: `0x${'34'.repeat(20)}`,
    },
  }],
  freshness: {
    lastValidatedAt: '2026-08-26T12:00:00.000Z',
    presentationStaleAfterSeconds: 86400,
    commerceFreshnessSeconds: 300,
  },
};

test('parses the service-first gateway catalog without category allowlists', () => {
  const parsed = parseServiceIndex({ services: [service] });

  assert.equal(parsed.services.length, 1);
  assert.equal(parsed.services[0].categoryFamily, 'scientific-services');
  assert.equal(parsed.services[0].providerName, 'Example Research LLC');
  assert.equal(parsed.services[0].skills[0].skillId, 'analyze-sample');
  assert.equal(priceRange(parsed.services[0]), '2.5 USDC');
  assert.equal(servicePath(parsed.services[0]), `/service/${service.serviceId}`);
});

test('rejects duplicate canonical service ids', () => {
  assert.throws(
    () => parseServiceIndex({ services: [service, service] }),
    /duplicate service IDs/,
  );
});

test('rejects unsafe provider URLs', () => {
  assert.throws(
    () => parseServiceIndex({
      services: [{ ...service, agentCardUrl: 'http://provider.example/card' }],
    }),
    /Agent Card URL is invalid/,
  );
});

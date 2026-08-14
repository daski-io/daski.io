import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reputationPresentation } from '../src/lib/reputationPresentation.ts';

const vectors = JSON.parse(readFileSync(
  new URL('./vectors/managed-marketplace-v1.json', import.meta.url),
  'utf8',
));

test('pins the marketplace reputation protocol vector used by public presentation', () => {
  assert.equal(vectors.domains.reputation.name, 'Daski Reputation');
  assert.equal(
    vectors.typeHashes.standardReputationOrderV1,
    '0x687c38759e553277de2157d04bcb5bee98a121ac0e4b9e3575866a768bb8d2ea',
  );
});

function reputation(overrides = {}) {
  return {
    transactionCount: '0', completedCount: '0', failedCount: '0', canceledCount: '0',
    completionSampleSize: '0', completionRate: null, confirmedCount: '0',
    notConfirmedCount: '0', confirmationSampleSize: '0', buyerSatisfactionRate: null,
    valueWeightedBuyerSatisfactionRate: null, totalPaid: '0', totalRefunded: '0',
    averageFulfillmentSeconds: null, fulfillmentSampleSize: '0', recentPurchases: [],
    finalizedBlock: null, ...overrides,
  };
}

function outcome(outcomeReputation) {
  return {
    providerReputation: reputation({ transactionCount: '12' }),
    serviceReputation: reputation({ transactionCount: '8' }),
    reputation: outcomeReputation,
  };
}

test('presents no sample as no signal rather than zero percent', () => {
  const presented = reputationPresentation(outcome(reputation()));
  assert.deepEqual(presented.rows.slice(0, 4), [
    { label: 'Outcome transactions', value: '0' },
    { label: 'Completion (0 samples)', value: '–' },
    { label: 'Buyer satisfaction (0 samples)', value: '–' },
    { label: 'Avg fulfillment (0 samples)', value: '–' },
  ]);
  assert.deepEqual(presented.providerRows.slice(0, 3), [
    { label: 'Provider transactions', value: '12' },
    { label: 'Provider completion (0)', value: '–' },
    { label: 'Provider satisfaction (0)', value: '–' },
  ]);
  assert.deepEqual(presented.recentPurchases, []);
});

test('presents finalized samples, revisions, refunds, and large numeric values', () => {
  const presented = reputationPresentation(outcome(reputation({
    transactionCount: '3', completedCount: '2', failedCount: '1',
    completionSampleSize: '3', completionRate: 66.67, confirmedCount: '1',
    notConfirmedCount: '1', confirmationSampleSize: '2', buyerSatisfactionRate: 50,
    valueWeightedBuyerSatisfactionRate: 75, totalPaid: '9007199254740993000000',
    totalRefunded: '5000000', averageFulfillmentSeconds: 90,
    fulfillmentSampleSize: '2', finalizedBlock: '9999999999999999',
    recentPurchases: [{ amount: '5000000', timestamp: '2026-08-13T12:00:00.000Z' }],
  })));
  assert.ok(presented.rows.some((row) => row.value === '66.67%'));
  assert.ok(presented.rows.some((row) => row.value === '75%'));
  assert.ok(presented.rows.some((row) => row.value === '5 USDC'));
  assert.ok(presented.rows.some((row) => row.value === '9007199254740993 USDC'));
  assert.ok(presented.rows.some((row) => row.value === '9999999999999999'));
  assert.deepEqual(presented.recentPurchases, [
    { label: 'Aug 13, 2026, 12:00 PM UTC', value: '5 USDC' },
  ]);
});

test('keeps partial and revised confirmation samples explicit at every scope', () => {
  const provider = reputation({
    transactionCount: '20', completionSampleSize: '12', completionRate: 75,
    confirmationSampleSize: '3', buyerSatisfactionRate: 33.33,
    valueWeightedBuyerSatisfactionRate: 66.67, totalPaid: '10000000',
  });
  const service = reputation({
    transactionCount: '9', completionSampleSize: '4', completionRate: 50,
    confirmationSampleSize: '1', buyerSatisfactionRate: 100, totalPaid: '4000000',
  });
  const presented = reputationPresentation({
    providerReputation: provider,
    serviceReputation: service,
    reputation: reputation(),
  });
  assert.ok(presented.providerRows.some((row) => row.label === 'Provider completion (12)'));
  assert.ok(presented.providerRows.some((row) => row.value === '66.67%'));
  assert.ok(presented.serviceRows.some((row) => row.label === 'Service satisfaction (1)'));
});

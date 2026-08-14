import assert from 'node:assert/strict';
import test from 'node:test';
import { reputationPresentation } from '../src/lib/reputationPresentation.ts';

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
  assert.deepEqual(presented.rows.slice(0, 6), [
    { label: 'Provider transactions', value: '12' },
    { label: 'Service transactions', value: '8' },
    { label: 'Outcome transactions', value: '0' },
    { label: 'Completion (0 samples)', value: '–' },
    { label: 'Buyer satisfaction (0 samples)', value: '–' },
    { label: 'Avg fulfillment (0 samples)', value: '–' },
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
    { label: '2026-08-13T12:00:00.000Z', value: '5 USDC' },
  ]);
});

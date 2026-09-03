import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  parseServiceIndex,
  priceRange,
  reputationRates,
  serviceCardData,
  servicePath,
} from '../src/lib/api.ts';

const serviceIndex = JSON.parse(readFileSync(
  new URL('./vectors/public-v3-services.json', import.meta.url),
  'utf8',
));
const service = serviceIndex.services[0];
const copyServiceIndex = () => structuredClone(serviceIndex);

test('parses the gateway-owned public services contract', () => {
  const parsed = parseServiceIndex(copyServiceIndex());

  assert.equal(parsed.services.length, 1);
  assert.equal(parsed.services[0].categoryFamily, 'scientific-services');
  assert.equal(parsed.services[0].providerName, 'Example Research LLC');
  assert.equal(parsed.services[0].skills[0].skillId, 'analyze-sample');
  assert.equal(parsed.services[0].skills[0].acceptingNewOrders, true);
  assert.match(parsed.services[0].skills[0].description, /\nReturns a signed result\./);
  assert.equal(priceRange(parsed.services[0]), '2.5 USDC');
  assert.equal(servicePath(parsed.services[0]), `/service/${service.serviceId}`);
  assert.equal(service.skills[0].contract.acceptingNewOrders, undefined);
});

test('reads mutable skill availability outside the hashed contract', () => {
  const paused = copyServiceIndex();
  paused.services[0].skills[0].acceptingNewOrders = false;
  paused.services[0].skills[0].contract.acceptingNewOrders = true;
  assert.equal(parseServiceIndex(paused).services[0].skills[0].acceptingNewOrders, false);

  const nestedOnly = copyServiceIndex();
  delete nestedOnly.services[0].skills[0].acceptingNewOrders;
  nestedOnly.services[0].skills[0].contract.acceptingNewOrders = true;
  assert.throws(
    () => parseServiceIndex(nestedOnly),
    /skill acceptingNewOrders is invalid/,
  );
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

test('parses nullable reputation blocks and derives display rates', () => {
  const enriched = {
    ...service,
    serviceReputation: {
      completed: '8', failed: '1', canceled: '1', confirmed: '6',
      notConfirmed: '2', refundedAmount: '2500000', transactions: '10',
      safeBlock: '4575440',
    },
    providerReputation: {
      completed: '12', failed: '2', canceled: '2', confirmed: '9',
      notConfirmed: '3', transactions: '16', safeBlock: '4575440',
    },
  };
  const parsed = parseServiceIndex({ services: [enriched] }).services[0];
  assert.equal(parsed.serviceReputation.refundedAmount, '2500000');
  assert.equal(parsed.providerReputation.refundedAmount, null);
  const rates = reputationRates(parsed.serviceReputation);
  assert.equal(rates.purchases, 10);
  assert.equal(rates.completionRate, 80);
  assert.equal(rates.buyerSatisfaction, 75);

  const bare = parseServiceIndex({ services: [service] }).services[0];
  assert.equal(bare.serviceReputation, null);
  assert.equal(bare.providerReputation, null);
});

test('rejects malformed reputation counters', () => {
  assert.throws(
    () => parseServiceIndex({
      services: [{
        ...service,
        serviceReputation: {
          completed: '8', failed: '1', canceled: '1', confirmed: '6',
          notConfirmed: '2', transactions: 'many', safeBlock: '4575440',
        },
      }],
    }),
    /transactions is invalid/,
  );
});

test('trims catalog rows to the fields a service card renders', () => {
  const [full] = parseServiceIndex(copyServiceIndex()).services;
  const card = serviceCardData(full);

  assert.deepEqual(Object.keys(card).sort(), [
    'categoryFamily', 'name', 'pricing', 'providerName', 'serviceId',
    'serviceType', 'skills', 'turnaroundEstimate',
  ]);
  assert.deepEqual(Object.keys(card.skills[0]).sort(), ['paymentRequired', 'skillId']);
  assert.equal(priceRange(card), priceRange(full));
  assert.equal(servicePath(card), servicePath(full));
  assert.ok(JSON.stringify(card).length < JSON.stringify(full).length / 2);
});

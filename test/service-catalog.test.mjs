import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  parseServiceIndex,
  priceRange,
  reputationRates,
  reputationTiles,
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

const aggregateStats = {
  completed: '8', failed: '2', canceled: '0', confirmed: '6',
  notConfirmed: '2', transactions: '10', safeBlock: '4575440',
};

test('accepts an optional recovered count on aggregate reputation', () => {
  const parse = (extra) => parseServiceIndex({
    services: [{
      ...service,
      serviceReputation: { ...aggregateStats, ...extra },
      providerReputation: { ...aggregateStats, ...extra },
    }],
  }).services[0];
  for (const [extra, expected] of [
    [{}, null], [{ recovered: null }, null], [{ recovered: '0' }, '0'], [{ recovered: '2' }, '2'],
  ]) {
    const parsed = parse(extra);
    assert.equal(parsed.serviceReputation.recovered, expected);
    assert.equal(parsed.providerReputation.recovered, expected);
    assert.equal(parsed.serviceReputation.failed, '2');
  }
  for (const recovered of [2, '1.5', '-1', '', 'many', {}]) {
    assert.throws(
      () => parseServiceIndex({
        services: [{ ...service, serviceReputation: { ...aggregateStats, recovered } }],
      }),
      /service reputation recovered is invalid/,
      `accepted ${JSON.stringify(recovered)}`,
    );
    assert.throws(
      () => parseServiceIndex({
        services: [{ ...service, providerReputation: { ...aggregateStats, recovered } }],
      }),
      /provider reputation recovered is invalid/,
      `accepted ${JSON.stringify(recovered)}`,
    );
  }
});

test('notes failed orders later recovered beside an unchanged completion rate', () => {
  const stats = { ...aggregateStats, refundedAmount: '2500000', recovered: null };
  const baseline = reputationTiles(stats);
  assert.deepEqual(baseline, [
    { label: 'Purchases', value: '10', note: null },
    { label: 'Completed', value: '8', note: null },
    { label: 'Completion rate', value: '80%', note: null },
    { label: 'Buyer satisfaction', value: '75%', note: null },
    { label: 'Refunded', value: '2.5 USDC', note: null },
  ]);
  const withoutNotes = (tiles) => tiles.map(({ note: _note, ...tile }) => tile);
  for (const [recovered, note] of [
    [undefined, null], [null, null], ['0', null],
    ['1', '1 failed order later recovered'], ['2', '2 failed orders later recovered'],
  ]) {
    const tiles = reputationTiles({ ...stats, recovered });
    assert.deepEqual(withoutNotes(tiles), withoutNotes(baseline));
    assert.deepEqual(tiles.map((tile) => tile.note), [null, null, note, null, null]);
    assert.deepEqual(reputationRates({ ...stats, recovered }), reputationRates(stats));
  }
});

test('each service reputation row notes its own recovered count', async () => {
  const parsed = parseServiceIndex({
    services: [{
      ...service,
      serviceReputation: { ...aggregateStats, recovered: '1' },
      providerReputation: { ...aggregateStats, failed: '3', recovered: '2' },
    }],
  }).services[0];
  const completionNote = (stats) => reputationTiles(stats)
    .find((tile) => tile.label === 'Completion rate').note;
  assert.equal(completionNote(parsed.serviceReputation), '1 failed order later recovered');
  assert.equal(completionNote(parsed.providerReputation), '2 failed orders later recovered');

  const component = await readFile(
    new URL('../src/components/service/ServicePurchasesAndUsage.tsx', import.meta.url),
    'utf8',
  );
  assert.match(component, /stats: service\.serviceReputation/);
  assert.match(component, /stats: service\.providerReputation/);
  assert.match(component, /const tiles = reputationTiles\(stats\);/);
  assert.match(component, /\{tile\.label\}<\/div>\s*\{tile\.note && \(/);
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

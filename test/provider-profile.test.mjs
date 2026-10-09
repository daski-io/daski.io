import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  parseServiceIndex,
  providerDetailFromServices,
  providerPath,
} from '../src/lib/api.ts';
import { providerProfilePresentation } from '../src/lib/providerPresentation.ts';
import { parseRailMetadata } from '../src/lib/railMetadata.ts';

const ROOT = new URL('../', import.meta.url);
const serviceFixture = JSON.parse(readFileSync(
  new URL('./vectors/public-v3-services.json', import.meta.url),
  'utf8',
));
const railFixture = JSON.parse(readFileSync(
  new URL('./vectors/daski-chain-v3.json', import.meta.url),
  'utf8',
));
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

function catalogService() {
  return parseServiceIndex(structuredClone(serviceFixture)).services[0];
}

test('groups catalog services into a provider detail and canonical route', () => {
  const service = catalogService();
  const sibling = structuredClone(service);
  sibling.gatewayRegistrationId = 'second-registration';
  sibling.serviceId = `0x${'cd'.repeat(32)}`;
  sibling.name = 'Second laboratory service';

  const outsider = structuredClone(service);
  outsider.gatewayRegistrationId = 'other-registration';
  outsider.providerAgentId = '99';
  outsider.serviceId = `0x${'ef'.repeat(32)}`;

  const provider = providerDetailFromServices([service, sibling, outsider], '41');

  assert.ok(provider);
  assert.equal(provider.providerName, 'Example Research LLC');
  assert.deepEqual(provider.services.map(({ name }) => name), [
    'Laboratory Analysis',
    'Second laboratory service',
  ]);
  assert.equal(providerPath(provider), '/provider/41');
  assert.equal(providerDetailFromServices([service], '99'), null);
  assert.throws(
    () => providerDetailFromServices([service], 'not-an-agent'),
    /provider agent ID is invalid/,
  );
});

test('joins provider services and purchases to standard-rail outcomes', () => {
  const service = catalogService();
  const provider = providerDetailFromServices([service], service.providerAgentId);
  const metadata = parseRailMetadata(structuredClone(railFixture));
  const outcome = metadata.outcomes[0];

  assert.ok(provider);
  outcome.providerAgentId = provider.providerAgentId;
  outcome.serviceId = service.serviceId;
  outcome.service = { id: service.serviceId, name: service.name };
  outcome.skill = { id: service.skills[0].skillId, name: service.skills[0].name };
  outcome.providerReputation.recentPurchases = structuredClone(
    outcome.serviceReputation.recentPurchases,
  );

  const presentation = providerProfilePresentation(provider, metadata);

  assert.equal(presentation.reputation?.transactionCount, '2');
  assert.equal(presentation.services[0].reputation?.totalPaid, '5000000');
  assert.equal(presentation.purchases.length, 1);
  assert.equal(presentation.purchases[0].outcome.serviceId, service.serviceId);
  assert.equal(presentation.purchases[0].buyerName, 'Test Buyer');
});

// The vector's outcome joined to the catalog provider, with the recovered
// counts set (or left absent) on a copy of its reputation blocks.
function joinedPresentation(recovered) {
  const service = catalogService();
  const provider = providerDetailFromServices([service], service.providerAgentId);
  const raw = structuredClone(railFixture);
  const source = raw.outcomes[0];
  // Two failed orders at provider scope, so both can be recovered.
  Object.assign(source.providerReputation, {
    transactionCount: '3', failedCount: '2', completionSampleSize: '3', completionRate: 33.33,
  });
  if ('provider' in recovered) source.providerReputation.recoveredCount = recovered.provider;
  if ('service' in recovered) source.serviceReputation.recoveredCount = recovered.service;
  const metadata = parseRailMetadata(raw);
  const outcome = metadata.outcomes[0];
  outcome.providerAgentId = provider.providerAgentId;
  outcome.serviceId = service.serviceId;
  return providerProfilePresentation(provider, metadata);
}

test('shows nothing for no recovered orders and never changes the completion rate', () => {
  for (const recovered of [{}, { provider: null, service: null }, { provider: '0', service: '0' }]) {
    const presentation = joinedPresentation(recovered);
    assert.equal(presentation.recovered, null);
    assert.equal(presentation.services[0].recovered, null);
    assert.equal(presentation.reputation?.completionRate, 33.33);
    assert.equal(presentation.services[0].reputation?.completionRate, 50);
  }
});

test('notes failed orders later recovered beside each unchanged completion rate', () => {
  const presentation = joinedPresentation({ provider: '2', service: '1' });
  const unrecovered = joinedPresentation({});

  assert.equal(presentation.recovered, '2 failed orders later recovered');
  assert.equal(presentation.services[0].recovered, '1 failed order later recovered');
  // Recovery is an additional fact: every other figure stays as read.
  assert.deepEqual(
    { ...presentation.reputation, recoveredCount: null },
    unrecovered.reputation,
  );
  assert.deepEqual(
    { ...presentation.services[0].reputation, recoveredCount: null },
    unrecovered.services[0].reputation,
  );
  assert.equal(presentation.reputation?.completionRate, 33.33);
  assert.equal(presentation.reputation?.failedCount, '2');
  assert.equal(presentation.services[0].reputation?.completionRate, 50);
  assert.equal(presentation.services[0].reputation?.failedCount, '1');
});

test('renders the recovered note next to the provider and service completion rates', async () => {
  const view = await read('src/views/ProviderProfilePage.tsx');

  assert.match(
    view,
    /label="Completion Rate"\s+value=\{reputationRate\(reputation\?\.completionRate \?\? null\)\}\s+note=\{presentation\.recovered\}/,
  );
  assert.match(view, /\{note && <span style=\{statNoteStyle\}>\{note\}<\/span>\}/);
  assert.match(view, /rows\.map\(\(\{ service, reputation, recovered \}, index\)/);
  assert.match(
    view,
    /\{reputationRate\(reputation\?\.completionRate \?\? null\)\}\s*<\/Mono>\s*\{recovered && <span style=\{tableNoteStyle\}>\{recovered\}<\/span>\}/,
  );
});

test('serves provider details from the catalog and links them from services', async () => {
  const [route, view, serviceDetails] = await Promise.all([
    read('src/pages/provider/[providerAgentId].astro'),
    read('src/views/ProviderProfilePage.tsx'),
    read('src/components/service/ProviderAndRailDetails.tsx'),
  ]);

  // Both reads address the instance's gateway target, never a module default.
  assert.match(route, /getProviderDetail\(target, providerAgentId\)/);
  assert.match(route, /getRailMetadata\(target\)/);
  assert.match(view, /All-time Purchases/);
  assert.match(view, /All-time Sales/);
  assert.match(view, /services offered by this provider/);
  assert.match(view, /recent purchases of this provider/);
  assert.match(serviceDetails, />Provider details<\/InternalLink>/);
});

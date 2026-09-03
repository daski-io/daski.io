import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  activityView,
  marketplacePresentation,
  relativeTime,
} from '../src/lib/marketplacePresentation.ts';
import { parseRailMetadata } from '../src/lib/railMetadata.ts';

const chainFixture = JSON.parse(readFileSync(
  new URL('./vectors/daski-chain-v3.json', import.meta.url),
  'utf8',
));

function reputation(overrides = {}) {
  return {
    transactionCount: '0', totalPaid: '0', recentPurchases: [], safeBlock: null,
    ...overrides,
  };
}

function outcome(outcomeId, outcomeReputation) {
  return {
    outcomeId,
    serviceId: `0x${(outcomeId === 'domain' ? '11' : '22').repeat(32)}`,
    providerAgentId: '1',
    serviceReputation: outcomeReputation,
  };
}

const domainReputation = reputation({
  transactionCount: '9007199254740993', totalPaid: '5000000000', safeBlock: '100',
  recentPurchases: [{
    amount: '5000000', outcomeId: 'domain', timestamp: '2026-08-16T12:00:00.000Z',
  }],
});

test('derives marketplace totals and public purchase rows from the new rail', () => {
  const domain = outcome('domain', domainReputation);
  const presented = marketplacePresentation({
    outcomes: [
      domain,
      { ...outcome('domain-renewal', domainReputation), serviceId: domain.serviceId },
      outcome('mailbox', reputation({
        transactionCount: '2', totalPaid: '1250000', safeBlock: '101',
        recentPurchases: [{
          amount: '1250000', outcomeId: 'mailbox', timestamp: '2026-08-17T12:00:00.000Z',
        }],
      })),
    ],
  });

  assert.equal(presented.serviceCount, 2);
  assert.equal(presented.transactionCount, '9007199254740995');
  assert.equal(presented.totalPaid, '5,001.25');
  assert.equal(presented.safeBlock, '101');
  assert.deepEqual(presented.purchases.map((purchase) => purchase.outcome.outcomeId), [
    'mailbox', 'domain',
  ]);
  assert.equal(relativeTime('2026-08-17T11:59:00.000Z', Date.parse('2026-08-17T12:00:00.000Z')), '1m ago');
});

test('retains the established marketplace hierarchy while using rail data', async () => {
  const root = new URL('../', import.meta.url);
  const read = (path) => readFile(new URL(path, root), 'utf8');
  const [activity, service, hero, details, skills, directory] = await Promise.all([
    read('src/views/ActivityPage.tsx'),
    read('src/views/ServiceDetailPage.tsx'),
    read('src/components/service/ServiceHero.tsx'),
    read('src/components/service/ProviderAndRailDetails.tsx'),
    read('src/components/service/ServiceSkillsTable.tsx'),
    read('src/components/home/ServicesDirectory.tsx'),
  ]);

  assert.match(activity, /What&apos;s happening on/);
  assert.match(activity, /The numbers\./);
  assert.match(activity, /Latest agent transactions\./);
  assert.match(activity, /The chain underneath\./);
  assert.match(service, /ServiceHero/);
  assert.match(service, /ServiceSkillsTable/);
  assert.match(service, /ProviderAndRailDetails/);
  assert.match(hero, /service\.turnaroundEstimate/);
  assert.match(
    directory,
    /title=\{service\.turnaroundEstimate\}[\s\S]*maxWidth: '25ch'[\s\S]*textOverflow: 'ellipsis'[\s\S]*whiteSpace: 'nowrap'[\s\S]*\{service\.turnaroundEstimate\}/,
  );
  assert.match(hero, /service\.jurisdictions/);
  assert.match(details, /service\.legal\.providerTermsUrl/);
  assert.match(details, /service\.providerAgentId/);
  assert.match(skills, /service\.skills\.map/);
  assert.doesNotMatch(details, /The payment route\.|Outcome splitter|listing manifest/i);
  assert.match(activity, /buyerDisplay/);
  assert.doesNotMatch(hero, /signed delivery deadline|x402-v2|exact-evm|bindingProfile/i);
  assert.doesNotMatch(skills, /signed deadline|exact-evm|bindingProfile/i);
  const rowsSource = activity.match(/const rows = contracts \? \[([\s\S]*?)\] : \[\];/);
  assert.ok(rowsSource, 'Activity contract rows were not found');
  const contractRows = [
    ...rowsSource[1].matchAll(
      /\{\s*name:\s*['"]([^'"]+)['"],\s*address:\s*contracts\.([A-Za-z]\w*)\s*\}/g,
    ),
  ].map(([, name, field]) => ({ name, field }));
  assert.deepEqual(contractRows, [
    { name: 'AgentIndex', field: 'agentIndex' },
    { name: 'ProviderRegistry', field: 'providerRegistry' },
    { name: 'ServiceRegistry', field: 'serviceRegistry' },
    { name: 'ValidationRegistry', field: 'validationRegistry' },
    { name: 'ReputationStorage', field: 'reputationStorage' },
  ]);
  assert.doesNotMatch(activity, /splitter/i);
  assert.match(activity, /Chain data unavailable\./);
  assert.match(activity, /Showing the last verified projection/);
});

test('flattens the activity view into serializable rows for the island', () => {
  const metadata = parseRailMetadata(structuredClone(chainFixture));
  const view = activityView(metadata, 1);

  assert.equal(view.chainId, 84532);
  assert.equal(view.network, metadata.network);
  assert.deepEqual(view.contracts, metadata.contracts);
  assert.equal(view.serviceCount, 1);
  assert.equal(view.purchases.length, 1);
  const [row] = view.purchases;
  const [purchase] = metadata.outcomes[0].serviceReputation.recentPurchases;
  assert.equal(row.serviceId, metadata.outcomes[0].serviceId);
  assert.equal(row.serviceName, 'Domain Management');
  assert.equal(row.skillName, 'Register Domain');
  assert.equal(row.amount, purchase.amount);
  assert.equal(row.orderKey, purchase.orderKey);
  assert.ok(!('outcome' in row), 'rows must not drag the full outcome along');
  assert.ok(JSON.stringify(view).length < JSON.stringify(metadata).length);
  assert.equal(activityView(metadata, 0).purchases.length, 0);
});

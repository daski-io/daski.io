import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  marketplacePresentation,
  relativeTime,
} from '../src/lib/marketplacePresentation.ts';

function reputation(overrides = {}) {
  return {
    transactionCount: '0', totalPaid: '0', recentPurchases: [], finalizedBlock: null,
    ...overrides,
  };
}

function outcome(outcomeId, outcomeReputation) {
  return {
    outcomeId,
    serviceId: `0x${(outcomeId === 'domain' ? '11' : '22').repeat(32)}`,
    providerAgentId: '1',
    reputation: outcomeReputation,
  };
}

const domainReputation = reputation({
  transactionCount: '9007199254740993', totalPaid: '5000000', finalizedBlock: '100',
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
        transactionCount: '2', totalPaid: '1250000', finalizedBlock: '101',
        recentPurchases: [{
          amount: '1250000', outcomeId: 'mailbox', timestamp: '2026-08-17T12:00:00.000Z',
        }],
      })),
    ],
  });

  assert.equal(presented.serviceCount, 2);
  assert.equal(presented.transactionCount, '9007199254740995');
  assert.equal(presented.totalPaid, '6.25');
  assert.equal(presented.finalizedBlock, '101');
  assert.deepEqual(presented.purchases.map((purchase) => purchase.outcome.outcomeId), [
    'mailbox', 'domain',
  ]);
  assert.equal(relativeTime('2026-08-17T11:59:00.000Z', Date.parse('2026-08-17T12:00:00.000Z')), '1m ago');
});

test('retains the established marketplace hierarchy while using rail data', async () => {
  const root = new URL('../', import.meta.url);
  const read = (path) => readFile(new URL(path, root), 'utf8');
  const [activity, service, hero, details, skills, purchases] = await Promise.all([
    read('src/views/ActivityPage.tsx'),
    read('src/views/ServiceDetailPage.tsx'),
    read('src/components/service/ServiceHero.tsx'),
    read('src/components/service/ProviderAndRailDetails.tsx'),
    read('src/components/service/ServiceSkillsTable.tsx'),
    read('src/components/service/ServicePurchasesAndUsage.tsx'),
  ]);

  assert.match(activity, /What&apos;s happening on/);
  assert.match(activity, /The numbers\./);
  assert.match(activity, /Latest agent transactions\./);
  assert.match(activity, /The chain underneath\./);
  assert.match(service, /ServiceHero/);
  assert.match(service, /ProviderAndRailDetails/);
  assert.match(hero, /All-time Purchases/);
  assert.doesNotMatch(details, /The payment route\.|Outcome splitter|listing manifest/i);
  assert.match(purchases, /how to use this service from your agent/);
  assert.match(activity, /buyerDisplay/);
  assert.match(purchases, /buyerDisplay/);
  assert.doesNotMatch(hero, /signed delivery deadline|x402-v2|exact-evm|bindingProfile/i);
  assert.doesNotMatch(skills, /signed deadline|exact-evm|bindingProfile/i);
  assert.match(activity, /Standard-order ReputationStorage/);
  assert.doesNotMatch(activity, /splitter/i);
});

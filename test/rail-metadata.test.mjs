import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  parseOutcomeIndex,
  parseProviderAgentUri,
  parseRailMetadata,
} from '../src/lib/railMetadata.ts';

const fixture = JSON.parse(readFileSync(
  new URL('./vectors/daski-chain-v3.json', import.meta.url),
  'utf8',
));

const copy = () => structuredClone(fixture);

test('parses the gateway-owned v3 Activity projection', () => {
  const parsed = parseRailMetadata(copy());

  assert.equal(parsed.version, 3);
  assert.equal(parsed.outcomeSchemaVersion, 1);
  assert.equal(parsed.chainId, 84532);
  assert.equal(parsed.outcomes.length, 1);
  assert.deepEqual(parsed.outcomes[0].service, {
    id: fixture.outcomes[0].serviceId,
    name: 'Domain Management',
  });
  assert.deepEqual(parsed.outcomes[0].skill, {
    id: 'register-domain',
    name: 'Register Domain',
  });
  assert.equal(parsed.outcomes[0].serviceReputation.transactionCount, '2');
  assert.equal(parsed.outcomes[0].serviceReputation.totalPaid, '5000000');
  assert.equal(parsed.outcomes[0].serviceReputation.recentPurchases.length, 1);
  assert.equal('reputation' in parsed.outcomes[0], false);
  assert.equal('bindingProfile' in parsed.outcomes[0], false);
  assert.equal(fixture.outcomes[0].fulfillmentObligationHash, undefined);
  assert.equal(fixture.outcomes[0].jurisdictionObligationHashes, undefined);
});

test('keeps the deployed unversioned outcome projection compatible with metadata v2', () => {
  const legacy = copy();
  legacy.version = 2;
  delete legacy.outcomeSchemaVersion;

  const parsed = parseRailMetadata(legacy);
  assert.equal(parsed.version, 2);
  assert.equal(parsed.outcomeSchemaVersion, null);
  assert.equal(parsed.outcomes[0].serviceReputation.safeBlock, '12345690');
});

test('ignores and reports additive fields once per shape', () => {
  const extended = copy();
  extended.outcomes[0].futureProvenance = { version: 1 };
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...values) => warnings.push(values.join(' '));
  try {
    parseRailMetadata(extended);
    parseRailMetadata(extended);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /standard outcome ignored unknown fields: futureProvenance/);
});

test('still fails closed on missing or malformed Activity fields', () => {
  const missingName = copy();
  delete missingName.outcomes[0].service.name;
  assert.throws(
    () => parseRailMetadata(missingName),
    /provider service presentation is missing required fields: name/,
  );

  const malformedRate = copy();
  malformedRate.outcomes[0].serviceReputation.completionRate = 101;
  assert.throws(() => parseRailMetadata(malformedRate), /completion rate is invalid/);

  const mismatchedSkill = copy();
  mismatchedSkill.outcomes[0].skill.id = 'different-skill';
  assert.throws(
    () => parseRailMetadata(mismatchedSkill),
    /does not match the admitted outcome/,
  );
});

test('requires the explicit outcome schema signal for metadata v3', () => {
  const missingVersion = copy();
  delete missingVersion.outcomeSchemaVersion;
  assert.throws(() => parseRailMetadata(missingVersion), /outcome schema version is invalid/);

  const mismatchedAsset = copy();
  mismatchedAsset.contracts.usdc = '0x5555555555555555555555555555555555555555';
  assert.throws(
    () => parseRailMetadata(mismatchedAsset),
    /contract USDC differs from the canonical payment asset/,
  );
});

test('parses the legacy public outcome index through the same narrow projection', () => {
  const parsed = parseOutcomeIndex({
    version: 2,
    outcomes: copy().outcomes,
  });
  assert.equal(parsed.outcomes[0].service.name, 'Domain Management');
});

test('reads the registered provider card URI from provider identity', () => {
  const registration = {
    agentId: '11',
    identity: {
      owner: '0x1111111111111111111111111111111111111111',
      agentWallet: '0x2222222222222222222222222222222222222222',
      agentUri: 'https://provider.example/.well-known/agent.json',
    },
  };
  assert.equal(
    parseProviderAgentUri(registration, '11'),
    'https://provider.example/.well-known/agent.json',
  );
  assert.throws(
    () => parseProviderAgentUri(registration, '12'),
    /agent ID does not match/,
  );
});

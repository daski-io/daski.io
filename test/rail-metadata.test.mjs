import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRailMetadata } from '../src/lib/railMetadata.ts';

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

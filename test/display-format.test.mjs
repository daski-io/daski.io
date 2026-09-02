import assert from 'node:assert/strict';
import test from 'node:test';
import { atomicUsdc } from '../src/lib/displayFormat.ts';

test('formats USDC with thousands separators without losing precision', () => {
  assert.equal(atomicUsdc('1000000000'), '1,000');
  assert.equal(atomicUsdc('1234567890'), '1,234.56789');
  assert.equal(atomicUsdc('9007199254740993000000'), '9,007,199,254,740,993');
});

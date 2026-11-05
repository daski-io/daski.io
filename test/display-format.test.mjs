import assert from 'node:assert/strict';
import test from 'node:test';
import { atomicUsdc, atomicUsdcCents } from '../src/lib/displayFormat.ts';

test('formats USDC with thousands separators without losing precision', () => {
  assert.equal(atomicUsdc('1000000000'), '1,000');
  assert.equal(atomicUsdc('1234567890'), '1,234.56789');
  assert.equal(atomicUsdc('9007199254740993000000'), '9,007,199,254,740,993');
});


test('formats USDC totals rounded to exactly two decimals', () => {
  assert.equal(atomicUsdcCents('0'), '0.00');
  assert.equal(atomicUsdcCents('4999'), '0.00');
  assert.equal(atomicUsdcCents('5000'), '0.01');
  assert.equal(atomicUsdcCents('1000000000'), '1,000.00');
  assert.equal(atomicUsdcCents('1234567890'), '1,234.57');
  assert.equal(atomicUsdcCents('1234564999'), '1,234.56');
  assert.equal(atomicUsdcCents('999995000'), '1,000.00');
  assert.equal(atomicUsdcCents('9007199254740993000000'), '9,007,199,254,740,993.00');
});

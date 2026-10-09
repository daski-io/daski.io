import assert from 'node:assert/strict';
import test from 'node:test';
import { atomicUsdc, recoveredOrdersNote } from '../src/lib/displayFormat.ts';

test('formats USDC with thousands separators without losing precision', () => {
  assert.equal(atomicUsdc('1000000000'), '1,000');
  assert.equal(atomicUsdc('1234567890'), '1,234.56789');
  assert.equal(atomicUsdc('9007199254740993000000'), '9,007,199,254,740,993');
});

test('notes failed orders later recovered only when there is at least one', () => {
  assert.equal(recoveredOrdersNote(undefined), null);
  assert.equal(recoveredOrdersNote(null), null);
  assert.equal(recoveredOrdersNote('0'), null);
  assert.equal(recoveredOrdersNote('1'), '1 failed order later recovered');
  assert.equal(recoveredOrdersNote('2'), '2 failed orders later recovered');
  assert.equal(
    recoveredOrdersNote('9007199254740993'),
    '9007199254740993 failed orders later recovered',
  );
  assert.equal(recoveredOrdersNote('many'), null);
});

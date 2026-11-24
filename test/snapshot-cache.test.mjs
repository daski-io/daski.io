import assert from 'node:assert/strict';
import test from 'node:test';
import { createSnapshotCache } from '../src/lib/snapshotCache.ts';

const FRESH_MS = 30_000;
const MAX_AGE_MS = 5 * 60_000;

// A cache on a hand-driven clock, with loads the test resolves itself.
function setup(options = {}) {
  const clock = { time: 1_000_000 };
  const backgroundErrors = [];
  const read = createSnapshotCache({
    freshMs: FRESH_MS,
    now: () => clock.time,
    onBackgroundError: (key, error) => backgroundErrors.push([key, error.message]),
    ...options,
  });
  const loads = [];
  const load = () => new Promise((resolve, reject) => loads.push({ resolve, reject }));
  return { clock, read, load, loads, backgroundErrors };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('the first read waits for the service and stores what it returns', async () => {
  const { clock, read, load, loads } = setup();
  const first = read('current', load);
  assert.equal(loads.length, 1);
  loads[0].resolve('v1');
  assert.deepEqual(await first, { value: 'v1', fetchedAt: clock.time });

  clock.time += FRESH_MS - 1;
  assert.equal((await read('current', load)).value, 'v1');
  assert.equal(loads.length, 1, 'a fresh copy starts no refresh');
});

test('a stale copy is served at once while one background refresh replaces it', async () => {
  const { clock, read, load, loads } = setup();
  const first = read('current', load);
  loads[0].resolve('v1');
  await first;

  clock.time += FRESH_MS;
  assert.equal((await read('current', load)).value, 'v1');
  assert.equal((await read('current', load)).value, 'v1');
  assert.equal(loads.length, 2, 'concurrent stale reads share one refresh');
  loads[1].resolve('v2');
  await settle();
  assert.equal((await read('current', load)).value, 'v2');
});

test('a copy past the reader\'s maximum age is not served: the read waits for a new one', async () => {
  const { clock, read, load, loads } = setup();
  const first = read('current', load);
  loads[0].resolve('v1');
  await first;

  // Nobody read for five minutes, so the cached copy is too old to advertise.
  clock.time += MAX_AGE_MS;
  const waiting = read('current', load, MAX_AGE_MS);
  const otherReader = read('current', load);
  assert.equal((await otherReader).value, 'v1', 'a reader without a maximum age still gets the old copy at once');
  assert.equal(loads.length, 2, 'both readers share one refresh');
  loads[1].resolve('v2');
  assert.deepEqual(await waiting, { value: 'v2', fetchedAt: clock.time });

  // Younger than the maximum age: served from the cache again.
  clock.time += MAX_AGE_MS - 1;
  assert.equal((await read('current', load, MAX_AGE_MS)).value, 'v2');
});

test('a failed refresh keeps the copy unless it is dropped, and only background failures are reported', async () => {
  const notFound = new Error('promotions /v1/promotions/launch → 404');
  const { clock, read, load, loads, backgroundErrors } = setup({ dropOn: (error) => error === notFound });
  const first = read('launch', load);
  loads[0].resolve('v1');
  await first;

  // A reader that waits sees the failure itself; the old copy stays for other readers.
  clock.time += MAX_AGE_MS;
  const waiting = read('launch', load, MAX_AGE_MS);
  loads[1].reject(new Error('fetch failed'));
  await assert.rejects(waiting, /fetch failed/);
  assert.equal((await read('launch', load)).value, 'v1');
  assert.equal(loads.length, 3, 'the stale read above started a new background refresh');

  // A background failure is reported and keeps the copy.
  loads[2].reject(new Error('timed out'));
  await settle();
  assert.deepEqual(backgroundErrors, [['launch', 'timed out']]);
  assert.equal((await read('launch', load)).value, 'v1');

  // A dropped failure (the service no longer knows the promotion) removes the copy silently.
  loads[3].reject(notFound);
  await settle();
  assert.equal(backgroundErrors.length, 1);
  const next = read('launch', load);
  assert.equal(loads.length, 5, 'with no copy left the read waits for the service');
  loads[4].resolve('v2');
  assert.equal((await next).value, 'v2');
});

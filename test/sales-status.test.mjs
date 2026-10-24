import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSalesStatusReader,
  effectiveSalesStatus,
  pageSalesStatus,
  parseSalesStatus,
  pauseRetryAfterSeconds,
  salesPauseNotice,
} from '../src/lib/salesStatus.ts';

const target = { gatewayUrl: 'https://gateway.example', gatewayInternalUrl: 'http://gateway.internal:8080' };
const json = (body, headers = {}, status = 200) => Response.json(body, { status, headers });
const start = Date.parse('2026-10-24T15:00:00Z');
const until = '2026-10-24T15:10:00.000Z';
const paused = { salesOpen: false, reason: 'Scheduled key switch', since: '2026-10-24T14:59:00.000Z', until };

// A gateway that answers each read with the next response, and a clock the test moves.
function gateway(...responses) {
  let now = start;
  let monotonic = 0;
  const reads = [];
  const request = async (url) => {
    reads.push(url);
    const next = responses.shift();
    if (!next) throw new Error('unexpected status read');
    return next();
  };
  const clock = { now: () => now, monotonic: () => monotonic };
  return {
    reads, read: createSalesStatusReader(request, clock),
    advance: (ms) => { now += ms; monotonic += ms; },
    stepWallClock: (ms) => { now += ms; },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('the status is read at the MCP origin and used for the gateway max-age, at most 15 seconds', async () => {
  const { reads, read, advance } = gateway(
    () => json({ salesOpen: true }, { 'cache-control': 'public, max-age=5' }),
    () => json(paused, { 'cache-control': 'max-age=60' }),
    () => json({ salesOpen: true }),
  );
  assert.deepEqual(await read(target), { salesOpen: true });
  assert.deepEqual(reads, ['http://gateway.internal:8080/public/v1/status']);
  advance(4_999);
  assert.deepEqual(await read(target), { salesOpen: true });
  assert.equal(reads.length, 1, 'fresh within max-age');
  // Past max-age the last status is still served while one background read replaces it.
  advance(1);
  const [first, second] = await Promise.all([read(target), read(target)]);
  assert.deepEqual([first, second], [{ salesOpen: true }, { salesOpen: true }]);
  await settle();
  assert.equal(reads.length, 2, 'one background read');
  assert.deepEqual(await read(target), paused);
  // A longer max-age is capped at 15 seconds; then the caller waits for a new read.
  advance(14_999);
  assert.deepEqual(await read(target), paused);
  assert.equal(reads.length, 2);
  advance(1);
  assert.deepEqual(await read(target), { salesOpen: true });
  assert.equal(reads.length, 3);
});

test('a status older than 15 seconds is never used, even without a max-age', async () => {
  const { reads, read, advance } = gateway(() => json(paused), () => json({ salesOpen: true }));
  assert.deepEqual(await read(target), paused);
  advance(14_000);
  assert.deepEqual(await read(target), paused);
  assert.equal(reads.length, 1);
  advance(1_000);
  assert.deepEqual(await read(target), { salesOpen: true });
  assert.equal(reads.length, 2);
});

test('concurrent first reads share one request', async () => {
  const { reads, read } = gateway(() => json(paused));
  const results = await Promise.all([read(target), read(target), read(target)]);
  assert.deepEqual(results, [paused, paused, paused]);
  assert.equal(reads.length, 1);
});

test('GATEWAY_URL is read when no internal origin is set; no gateway means open without a read', async () => {
  const { reads, read } = gateway(() => json({ salesOpen: true }));
  await read({ gatewayUrl: 'https://gateway.example', gatewayInternalUrl: null });
  assert.deepEqual(reads, ['https://gateway.example/public/v1/status']);
  assert.deepEqual(await read({ gatewayUrl: null, gatewayInternalUrl: null }), { salesOpen: true });
  assert.equal(reads.length, 1);
});

test('a status that cannot be read counts as open, is read again after five seconds and is logged once', async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const { reads, read, advance } = gateway(
    () => { throw new TypeError('fetch failed'); },
    () => json({ error: { code: 'INTERNAL_ERROR', message: 'Down' } }, {}, 500),
    () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
    () => json({ salesOpen: 'false' }),
    () => json(paused),
    () => json({ error: 'not found' }, {}, 404),
  );
  assert.deepEqual(await read(target), { salesOpen: true });
  advance(4_999);
  assert.deepEqual(await read(target), { salesOpen: true });
  assert.equal(reads.length, 1);
  for (let attempt = 2; attempt <= 4; attempt++) {
    advance(15_000);
    assert.deepEqual(await read(target), { salesOpen: true });
    assert.equal(reads.length, attempt);
  }
  assert.equal(logged.mock.callCount(), 1, 'logged when it became unreadable, not on every read');
  advance(15_000);
  assert.deepEqual(await read(target), paused);
  // A pause the gateway reported is not kept once its status cannot be read.
  advance(15_000);
  assert.deepEqual(await read(target), { salesOpen: true });
  assert.equal(logged.mock.callCount(), 2);
  assert.match(String(logged.mock.calls[1].arguments[0]), /sales count as open once no status was read in the last 15 seconds/);
});

test('a failed background read keeps the last pause until it is 15 seconds old', async (t) => {
  t.mock.method(console, 'error', () => {});
  const { reads, read, advance } = gateway(
    () => json(paused, { 'cache-control': 'max-age=5' }),
    () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError'); },
    () => json({ error: 'unavailable' }, {}, 503),
    () => { throw new TypeError('fetch failed'); },
  );
  assert.deepEqual(await read(target), paused);
  advance(6_000);
  assert.deepEqual(await read(target), paused);
  await settle();
  assert.equal(reads.length, 2);
  advance(1_000);
  assert.deepEqual(await read(target), paused, 'still paused after the failed refresh');
  await settle();
  assert.equal(reads.length, 3);
  // Without a status read in the last 15 seconds, sales count as open.
  advance(8_000);
  assert.deepEqual(await read(target), { salesOpen: true });
  assert.equal(reads.length, 4);
});

test('a wall clock step does not stretch how long a read is used', async () => {
  const { reads, read, advance, stepWallClock } = gateway(() => json({ salesOpen: true }), () => json(paused));
  assert.deepEqual(await read(target), { salesOpen: true });
  stepWallClock(-60 * 60_000);
  advance(15_000);
  assert.equal((await read(target)).salesOpen, false);
  assert.equal(reads.length, 2);
});

test('a page waits at most its limit for a read, then renders as open while the read fills the cache', async () => {
  let finish;
  const slow = new Promise((resolve) => { finish = resolve; });
  // The system clock: the pause ends ten minutes from now.
  const later = { ...paused, until: new Date(Date.now() + 10 * 60_000).toISOString() };
  const reader = createSalesStatusReader(async () => {
    await slow;
    return json(later);
  });
  const started = performance.now();
  assert.deepEqual(await pageSalesStatus(target, reader, 20), { salesOpen: true });
  assert.ok(performance.now() - started < 1_000);
  finish();
  assert.deepEqual(await reader(target), later, 'the late read completes');
  assert.deepEqual(await pageSalesStatus(target, reader, 20), later, 'and pages then use it at once');
  assert.deepEqual(await pageSalesStatus({ gatewayUrl: null, gatewayInternalUrl: null }, reader, 20), { salesOpen: true });
});

test('a pause past its end counts as open without another read', async () => {
  const { reads, read, advance } = gateway(() => json({ ...paused, until: '2026-10-24T15:00:10Z' }));
  assert.equal((await read(target)).salesOpen, false);
  advance(10_000);
  assert.deepEqual(await read(target), { salesOpen: true });
  assert.equal(reads.length, 1);
});

test('the status body is parsed strictly for salesOpen and leniently for the pause details', () => {
  assert.deepEqual(parseSalesStatus({ salesOpen: true, reason: 'ignored' }), { salesOpen: true });
  assert.deepEqual(parseSalesStatus({ salesOpen: false, reason: '  Key switch ', since: '2026-10-24T14:59:00Z', until: '2026-10-24T15:10:00+00:00' }),
    { salesOpen: false, reason: 'Key switch', since: '2026-10-24T14:59:00.000Z', until: '2026-10-24T15:10:00.000Z' });
  // A reported pause stays a pause when its details are unusable.
  assert.deepEqual(parseSalesStatus({ salesOpen: false, reason: 'line\nbreak', until: 'soon' }),
    { salesOpen: false, reason: null, since: null, until: null });
  assert.equal(parseSalesStatus({ salesOpen: false, reason: 'x'.repeat(501) }).reason, null);
  for (const hidden of ['abc\u202Edef', 'zero\u200Bwidth', 'line\u2028separator']) {
    assert.equal(parseSalesStatus({ salesOpen: false, reason: hidden }).reason, null, JSON.stringify(hidden));
  }
  for (const invalid of [null, [], 'paused', {}, { salesOpen: 'false' }, { salesOpen: 0 }]) {
    assert.throws(() => parseSalesStatus(invalid), /sales status/);
  }
});

test('an ended pause is open, and Retry-After counts whole seconds to the end', () => {
  const now = Date.parse('2026-10-24T15:09:59.200Z');
  assert.equal(effectiveSalesStatus(paused, now), paused);
  assert.deepEqual(effectiveSalesStatus(paused, Date.parse(until)), { salesOpen: true });
  assert.deepEqual(effectiveSalesStatus({ ...paused, until: null }, Date.parse(until) + 1), { ...paused, until: null });
  assert.equal(pauseRetryAfterSeconds(until, now), 1);
  assert.equal(pauseRetryAfterSeconds(until, start), 600);
  assert.equal(pauseRetryAfterSeconds(until, Date.parse(until) + 5_000), 1);
  assert.equal(pauseRetryAfterSeconds(null, start), 60);
});

test('the banner names the end in UTC, rounded up to the minute, and the reason', () => {
  assert.equal(salesPauseNotice({ salesOpen: true }), null);
  assert.deepEqual(salesPauseNotice(paused), {
    headline: 'Sales are paused until Oct 24, 2026, 15:10 UTC.',
    detail: 'New quotes and purchases resume then. Orders already paid continue normally.',
    reason: 'Scheduled key switch',
  });
  assert.equal(salesPauseNotice({ ...paused, until: '2026-10-24T15:07:01Z' }).headline, 'Sales are paused until Oct 24, 2026, 15:08 UTC.');
  assert.deepEqual(salesPauseNotice({ ...paused, reason: null, until: null }), {
    headline: 'Sales are paused.',
    detail: 'New quotes and purchases resume shortly. Orders already paid continue normally.',
    reason: null,
  });
});

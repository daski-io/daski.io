import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { GatewayHttpError, internalFailure } from '../src/lib/api.ts';

const listening = async (handler) => {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
};
const closed = (server) => new Promise((resolve) => server.close(resolve));
const failure = (url, signal) => fetch(url, { signal }).then(
  () => assert.fail('the request was expected to fail'),
  (error) => error,
);

test('a gateway answer or an abandoned request stands as it is', () => {
  assert.equal(internalFailure(new GatewayHttpError(404, '/public/v3/services/0x00')), 'final');
  const caller = new AbortController();
  caller.abort();
  assert.equal(internalFailure(caller.signal.reason, caller.signal), 'final');
});

test('a timed-out internal request is not replayed against the public origin', async () => {
  // A gateway that accepts the request and never answers it.
  const server = await listening(() => {});
  try {
    const { port } = server.address();
    const error = await failure(`http://127.0.0.1:${port}/public/v3/services`, AbortSignal.timeout(50));
    assert.equal(internalFailure(error), 'timeout');
  } finally {
    server.closeAllConnections();
    await closed(server);
  }
});

test('an unreachable internal origin or a server error goes to the public origin', async () => {
  assert.equal(internalFailure(new GatewayHttpError(503, '/public/v3/services')), 'retry');
  // Nothing listens on the port a closed server held: the connection is refused.
  const server = await listening(() => {});
  const { port } = server.address();
  await closed(server);
  const error = await failure(`http://127.0.0.1:${port}/public/v3/services`, AbortSignal.timeout(5_000));
  assert.equal(internalFailure(error), 'retry');
});

import { mcpClientAddress } from '../src/mcp/clientAddress.ts';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createWebsiteMcp } from '../src/mcp/server.ts';
import { resolveNetworkConfig } from '../src/lib/network.ts';
import { GUIDE_FILES, renderGuide } from '../src/lib/agentGuides.ts';

const contract = JSON.parse(await readFile(new URL('./fixtures/gateway-wire/mcp-tool-surface.json', import.meta.url), 'utf8'));
const templates = Object.fromEntries(await Promise.all(GUIDE_FILES.map(async file => [file,
  await readFile(new URL(`../src/skills/${file}`, import.meta.url), 'utf8')])));
const config = resolveNetworkConfig({ SITE_URL: 'https://website.example', GATEWAY_URL: 'https://gateway.example', GATEWAY_INTERNAL_URL: 'http://gateway.internal:8080' });
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers });
const payer = '0x' + '1'.repeat(40);
const signature = '0x' + '22'.repeat(65);
const actionAuthorization = { orderId: 'order-1', action: 'status', method: 'POST', absoluteResourceUri: 'https://gateway.example/orders/handle/actions/status',
  requestHash: '0x' + '3'.repeat(64), nonce: '0x' + '4'.repeat(64), issuedAt: 1, validBefore: 2, signature };

function fixture(t, responder = () => json({ ok: true }), override = {}) {
  const selected = { ...config, ...override };
  const calls = [];
  const fetcher = async (url, init) => {
    const call = { path: new URL(url).pathname, url, init, body: init.body && JSON.parse(init.body) };
    calls.push(call);
    if (call.path === '/.well-known/mcp.json') return json({ confirmationSigning: { chainId: 84532 } });
    return responder(call);
  };
  const server = createWebsiteMcp(selected, file => renderGuide(file, templates, selected), fetcher);
  t.after(() => server.close());
  async function rpc(method, params = {}, meta) {
    const request = new Request('https://website.example/mcp', { method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: { ...params, ...(meta ? { _meta: meta } : {}) } }),
    });
    const response = await server.fetch(request, '192.0.2.4');
    const text = await response.text();
    assert.equal(response.status, 200, text);
    const raw = text.startsWith('event:') || text.startsWith('data:')
      ? text.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('') : text;
    const value = JSON.parse(raw);
    assert.ok(value.result, JSON.stringify(value));
    return value.result;
  }
  return { server, calls, rpc, tool: (name, args = {}, meta) => rpc('tools/call', { name, arguments: args }, meta) };
}

test('website runs the existing full MCP tool contract and serves its local guide without the gateway', async t => {
  const { rpc, tool, calls } = fixture(t);
  const listed = await rpc('tools/list');
  const tools = listed.tools.map(({ name, inputSchema, outputSchema, annotations }) => ({ name, inputSchema, outputSchema, annotations })).sort((a,b) => a.name.localeCompare(b.name));
  assert.deepEqual({ schemaVersion: 1, tools }, contract);
  const result = await tool('daski_get_setup_guide');
  const guide = renderGuide('setup.md', templates, config);
  assert.deepEqual(result.structuredContent, { topic: 'setup', markdown: guide.content, sha256: guide.sha256, url: guide.url });
  assert.equal(result.structuredContent.sha256, createHash('sha256').update(result.structuredContent.markdown).digest('hex'));
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  assert.equal(calls.length, 0);
});

test('quote and payment preserve x402 metadata and send the identical request to gateway REST', async t => {
  const paymentRequired = { x402Version: 2, resource: { url: 'https://gateway.example/outcomes/42/domain' }, accepts: [] };
  const receipt = { transaction: '0xreceipt', success: true };
  const { tool, calls } = fixture(t, ({ path, body }) => {
    if (path.endsWith('/quote')) return json({ orderHandle: 'draft', paymentRequired, preflight: { sufficient: true } });
    assert.equal(path, '/outcomes/42/domain/purchase');
    if (!body.paymentPayload) return json(paymentRequired, 402);
    return json({ state: 'DISPATCHED', orderHandle: 'paid', receipt: { ok: true }, x402OfferReceipt: null }, 200,
      { 'payment-response': Buffer.from(JSON.stringify(receipt)).toString('base64url') });
  });
  const args = { providerAgentId: '42', outcomeId: 'domain', request: { name: 'example.info', payerAddress: 'provider-request-field' }, payerAddress: payer };
  const quote = await tool('daski_get_payment_challenge', args);
  assert.deepEqual(quote._meta['x402/payment-required'], paymentRequired);
  assert.equal(quote.structuredContent.orderHandle, 'draft');
  const unpaid = await tool('daski_buy_outcome', args);
  assert.equal(unpaid.isError, true);
  assert.deepEqual(unpaid._meta['x402/payment-required'], paymentRequired);
  const payment = { x402Version: 2, payload: { signature }, extensions: { 'payment-identifier': { info: { id: 'intent-123456789012' } } } };
  const paid = await tool('daski_buy_outcome', args, { 'x402/payment': payment });
  assert.equal(paid.structuredContent.status, 'DISPATCHED');
  assert.deepEqual(paid._meta['x402/payment-response'], receipt);
  const purchase = calls.filter(call => call.path.endsWith('/purchase'));
  assert.deepEqual(purchase[1].body.request, args.request);
  assert.deepEqual(purchase[1].body.paymentPayload, payment);
  assert.equal(purchase[1].init.headers.get('x-forwarded-for'), '192.0.2.4');
  assert.ok(calls.every(call => call.url.startsWith('http://gateway.internal:8080/')));
});

test('order actions preserve signed authority and isolate provider content', async t => {
  const { tool, calls } = fixture(t, ({ path }) => path.endsWith('/challenge')
    ? json({ signRequest: { gateway: 'https://gateway.example' } }) : json({ state: 'FULFILLED', result: { artifact: 'provider content' } }));
  const first = await tool('daski_get_order_access', { orderHandle: 'handle' });
  assert.equal(first.structuredContent.authorizationType, 'OrderActionAuthorizationV1');
  assert.equal(first.structuredContent.challenge.signRequest.gateway, 'https://gateway.example');
  const result = await tool('daski_get_order_status', { orderHandle: 'handle', readCapability: 'c'.repeat(80) });
  assert.equal(result.structuredContent.result, undefined);
  assert.deepEqual(JSON.parse(Buffer.from(result.structuredContent.untrustedResult.content, 'base64')), { artifact: 'provider content' });
  const read = calls.find(call => call.path.endsWith('/status'));
  assert.deepEqual(read.body, { request: {} });
  assert.equal(read.init.headers.get('authorization'), 'DaskiReadCap ' + 'c'.repeat(80));
  await tool('daski_submit_order_input', { orderHandle: 'handle', request: { document: 'value' }, authorization: actionAuthorization });
  assert.deepEqual(calls.at(-1).body.authorization, actionAuthorization);
  const before = calls.length;
  const denied = await tool('daski_get_order_status', { orderHandle: 'handle', authorization: actionAuthorization, readCapability: 'c'.repeat(80) });
  assert.equal(denied.structuredContent.code, 'WALLET_AUTHORIZATION_INVALID');
  assert.equal(calls.length, before);
});

test('wallet reconciliation keeps the payment identifier in the gateway request', async t => {
  const { tool, calls } = fixture(t, () => json({ authorizationRequired: true, code: 'WALLET_AUTHORIZATION_REQUIRED', challenge: {} }));
  const result = await tool('daski_list_my_orders', { payer, paymentIdentifier: 'intent-123456789012' });
  assert.equal(result.structuredContent.code, 'WALLET_AUTHORIZATION_REQUIRED');
  assert.deepEqual(calls.at(-1).body, { payer, paymentIdentifier: 'intent-123456789012', authorization: null, cursor: null, limit: 25 });
});

test('every lifecycle, wallet, search and identity tool uses its intended REST path', async t => {
  const { tool, calls } = fixture(t);
  const cases = [
    ['daski_get_outcome_requirements', { providerAgentId: '42', outcomeId: 'domain' }, '/outcomes/42/domain/requirements'],
    ['daski_list_outcomes', {}, '/public/v2/outcomes/search'],
    ['daski_get_outcome', { providerAgentId: '42', outcomeId: 'domain' }, '/public/v2/outcomes/42/domain'],
    ['daski_cancel_order', { orderHandle: 'handle' }, '/orders/handle/actions/cancel/challenge'],
    ['daski_get_order_artifact', { orderHandle: 'handle' }, '/orders/handle/actions/artifact/challenge'],
    ['daski_contact_order_support', { orderHandle: 'handle' }, '/orders/handle/actions/support/challenge'],
    ['daski_confirm_delivery', { orderHandle: 'handle' }, '/orders/handle/actions/confirmation/challenge'],
    ['daski_revoke_delivery_confirmation', { orderHandle: 'handle' }, '/orders/handle/actions/revoke-confirmation/challenge'],
    ['daski_get_my_reputation', { payer }, '/wallet/reputation'],
    ['daski_list_assets', { payer }, '/wallet/assets'],
    ['daski_use_asset', { payer, providerAgentId: '42', actionId: 'renew', providerAssetId: '00000000-0000-4000-8000-000000000001', input: {} }, '/wallet/assets/action'],
    ['daski_resolve_agent', { wallet: payer }, `/public/v2/registry/identity/${payer}`],
  ];
  for (const [name, args, path] of cases) {
    const result = await tool(name, args);
    assert.notEqual(result.isError, true, JSON.stringify(result));
    assert.equal(calls.at(-1).path, path);
  }
});

test('registry discovery retains admitted provider filtering and non-retryable missing ids', async t => {
  const serviceId = '0x' + 'a'.repeat(64);
  const { tool } = fixture(t, ({ path }) => {
    if (path === '/public/v2/outcomes') return json({ outcomes: [{ providerAgentId: '42', serviceId, outcomeId: 'domain' }] });
    if (path.endsWith('/999')) return json({ error: { code: 'MARKETPLACE_NOT_FOUND', message: 'No provider is registered under id 999' } }, 404);
    return json({ id: '42' });
  });
  const providers = (await tool('daski_list_providers')).structuredContent;
  assert.equal(providers.total, '1');
  assert.deepEqual(providers.providers[0].activeOutcomeIds, ['domain']);
  assert.equal((await tool('daski_get_provider', { agentId: '42' })).structuredContent.marketplaceAdmitted, true);
  assert.equal((await tool('daski_get_service', { serviceId })).structuredContent.marketplaceAdmitted, true);
  const missing = (await tool('daski_get_provider', { agentId: '999' })).structuredContent;
  assert.equal(missing.code, 'MARKETPLACE_NOT_FOUND');
  assert.equal(missing.retryable, false);
  assert.match(missing.next_action, /unknown ids are not retried/);
});

test('a failed signed purchase is never retried and reports possible settlement', async t => {
  const { tool, calls } = fixture(t, () => { throw new Error('network lost after submission'); });
  const result = await tool('daski_buy_outcome', { providerAgentId: '42', outcomeId: 'domain', request: {}, paymentPayload: { payload: { signature } } });
  assert.equal(calls.filter(call => call.path.endsWith('/purchase')).length, 1);
  assert.equal(result.structuredContent.paymentMayHaveSettled, true);
  assert.equal(result.structuredContent.requiresNewSignature, false);
  assert.match(result.structuredContent.next_action, /Reconcile/);
});

test('wrong network is refused before reaching a transaction endpoint', async t => {
  const { tool, calls } = fixture(t, undefined, { chainId: 8453 });
  const result = await tool('daski_buy_outcome', { providerAgentId: '42', outcomeId: 'domain', request: {} });
  assert.equal(result.structuredContent.code, 'GATEWAY_NETWORK_MISMATCH');
  assert.equal(calls.length, 1);
});

test('gateway public failure details and recovery hints survive the MCP boundary', async t => {
  const { tool } = fixture(t, () => json({ error: { code: 'SIGNATURE_VERIFICATION_UNAVAILABLE', message: 'Try unchanged', paymentMayHaveSettled: false, retryable: true } }, 503, { 'daski-next-action': 'Retry the same signature.' }));
  const result = await tool('daski_buy_outcome', { providerAgentId: '42', outcomeId: 'domain', request: {} });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.next_action, 'Retry the same signature.');
  assert.equal(result.structuredContent.paymentMayHaveSettled, false);
});

test('ingress rejects foreign origins, duplicate keys, batches and oversized bodies before execution', async t => {
  const { server, calls } = fixture(t);
  for (const [body, status, origin] of [['{"a":1,"a":2}', 400], ['[]', 400], ['x'.repeat(1024 * 1024 + 1), 413], ['{}', 403, 'https://untrusted.example']]) {
    const headers = { 'content-type': 'application/json' }; if (origin) headers.origin = origin;
    const response = await server.fetch(new Request('https://website.example/mcp', { method: 'POST', headers, body }));
    assert.equal(response.status, status);
  }
  assert.equal(calls.length, 0);
});

test('MCP client admission counts proxy hops from the socket and ignores spoofed prefixes', () => {
  assert.equal(mcpClientAddress('10.0.0.1', '198.51.100.1, 192.0.2.4', 1), '192.0.2.4');
  assert.equal(mcpClientAddress('192.0.2.4', '198.51.100.1', 0), '192.0.2.4');
  assert.equal(mcpClientAddress('10.0.0.1', 'not-an-ip', 1), '10.0.0.1');
  assert.throws(() => resolveNetworkConfig({ MCP_TRUST_PROXY: '-1' }), /MCP_TRUST_PROXY/);
});

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Tests the actual compiled Astro endpoints, raw guide bundling, MCP streaming,
// and the preserved gateway URL. The gateway is an offline REST fixture.
const calls = [];
let siteUrl;
const gateway = createServer(async (req, res) => {
  if (req.url === '/mcp') { res.writeHead(307, { location: `${siteUrl}/mcp` }); res.end(); return; }
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
  calls.push({ path: req.url, body });
  res.setHeader('content-type', 'application/json');
  if (req.url === '/.well-known/mcp.json') { res.end(JSON.stringify({ confirmationSigning: { chainId: 84532 }, transport: { type: 'streamable-http', url: 'https://gateway.example/mcp' }, buyerCli: { version: '0.4.3' } })); return; }
  if (req.url === '/public/v2/outcomes/search') { res.end(JSON.stringify({ outcomes: [], searchHint: { terms: ['domain'] } })); return; }
  if (req.url === '/outcomes/42/domain/purchase') {
    if (!body.paymentPayload) { res.writeHead(402); res.end(JSON.stringify({ x402Version: 2, accepts: [] })); }
    else { res.end(JSON.stringify({ state: 'DISPATCHED', orderHandle: 'smoke-order', receipt: {}, x402OfferReceipt: null })); }
    return;
  }
  res.writeHead(404); res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Unknown fixture route' } }));
});
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
await listen(gateway);
const gatewayUrl = `http://127.0.0.1:${gateway.address().port}`;
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
process.env.DASKI_NETWORK = 'testnet';
process.env.GATEWAY_URL = gatewayUrl;
process.env.GATEWAY_INTERNAL_URL = gatewayUrl;
const { handler } = await import('../dist/server/entry.mjs');
const site = createServer(handler);
await listen(site);
siteUrl = `http://127.0.0.1:${site.address().port}`;
process.env.SITE_URL = siteUrl;
const contract = JSON.parse(await readFile(new URL('../test/fixtures/gateway-wire/mcp-tool-surface.json', import.meta.url), 'utf8'));
async function rpc(base, method, params = {}) {
  const response = await fetch(`${base}/mcp`, { method: 'POST', headers: {
    'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18',
  }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const raw = await response.text();
  assert.equal(response.status, 200, raw);
  const text = raw.startsWith('event:') || raw.startsWith('data:') ? raw.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('') : raw;
  const value = JSON.parse(text); assert.ok(value.result, JSON.stringify(value)); return value.result;
}
try {
  const indexResponse = await fetch(`${siteUrl}/.well-known/agent-skills/index.json`);
  assert.equal(indexResponse.status, 200);
  const index = await indexResponse.json();
  for (const guide of index.skills) {
    const response = await fetch(guide.url); assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/markdown/);
    const text = await response.text(); assert.doesNotMatch(text, /\{\{/);
    assert.equal(createHash('sha256').update(text).digest('hex'), guide.sha256);
  }
  for (const path of ['/llms.txt', '/llms-full.txt', '/skill.md', '/SKILL.md', '/.well-known/skills/index.json', '/.well-known/skills/daski/SKILL.md']) {
    assert.equal((await fetch(siteUrl + path)).status, 200, path);
  }
  assert.equal((await fetch(`${siteUrl}/skills/not-a-guide.md`)).status, 404);
  const metadata = await (await fetch(`${siteUrl}/.well-known/mcp.json`)).json();
  assert.equal(metadata.transport.url, siteUrl + '/mcp');
  const agents = await (await fetch(siteUrl + '/agents')).text();
  assert.ok(agents.includes(`Fetch ${siteUrl}/skills/setup.md`));
  const listed = await rpc(siteUrl, 'tools/list');
  assert.deepEqual(listed.tools.map(({name,inputSchema,outputSchema,annotations}) => ({name,inputSchema,outputSchema,annotations})).sort((a,b) => a.name.localeCompare(b.name)), contract.tools);
  const guide = await rpc(siteUrl, 'tools/call', { name: 'daski_get_setup_guide', arguments: {} });
  assert.equal(guide.structuredContent.markdown, await (await fetch(siteUrl + '/skills/setup.md')).text());
  const search = await rpc(gatewayUrl, 'tools/call', { name: 'daski_list_outcomes', arguments: { text: 'domain' } });
  assert.deepEqual(search.structuredContent.outcomes, []);
  assert.ok(calls.some(call => call.path === '/public/v2/outcomes/search' && call.body.text === 'domain'));
  const args = { providerAgentId: '42', outcomeId: 'domain', request: { name: 'example.info' } };
  assert.equal((await rpc(gatewayUrl, 'tools/call', { name: 'daski_buy_outcome', arguments: args })).isError, true);
  const paid = await rpc(gatewayUrl, 'tools/call', { name: 'daski_buy_outcome', arguments: { ...args, paymentPayload: { fixture: true } } });
  assert.equal(paid.structuredContent.status, 'DISPATCHED');
  assert.equal(calls.filter(call => call.path === '/outcomes/42/domain/purchase' && call.body.paymentPayload).length, 1);
  console.log('Built website: all guide routes, rendered prompt, MCP contract, legacy redirect, and REST purchase handoff passed.');
} finally {
  for (const server of [site, gateway]) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The built site and MCP against an offline gateway whose sales status is
// open, paused, or unreadable (a gateway without the status endpoint). Each
// scenario gets a fresh process, like a deployed instance, so no cached
// status carries over.
const scenario = process.argv[2];
if (!scenario) {
  for (const name of ['open', 'paused', 'unreadable']) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), name], { stdio: 'inherit', timeout: 30_000 });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Sales status scenario ${name} failed`);
  }
  process.exit(0);
}

const catalog = JSON.parse(await readFile(new URL('../test/vectors/public-v3-services.json', import.meta.url), 'utf8'));
const rail = JSON.parse(await readFile(new URL('../test/vectors/daski-chain-v3.json', import.meta.url), 'utf8'));
const service = catalog.services[0];
// On a whole minute, so the banner shows it exactly.
const until = new Date(Math.ceil((Date.now() + 10 * 60_000) / 60_000) * 60_000);
const since = new Date(Date.now() - 60_000);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = value => String(value).padStart(2, '0');
const untilText = `${MONTHS[until.getUTCMonth()]} ${until.getUTCDate()}, ${until.getUTCFullYear()}, ${pad(until.getUTCHours())}:${pad(until.getUTCMinutes())} UTC`;

const calls = [];
const gateway = createServer(async (req, res) => {
  for await (const _chunk of req);
  calls.push(req.url);
  const send = (status, body, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
  if (req.url === '/public/v1/status') {
    if (scenario === 'open') return send(200, { salesOpen: true }, { 'cache-control': 'max-age=5' });
    if (scenario === 'paused') {
      return send(200, { salesOpen: false, reason: 'Scheduled key switch', since: since.toISOString(), until: until.toISOString() }, { 'cache-control': 'max-age=5' });
    }
  }
  if (req.url === '/.well-known/mcp.json') return send(200, { confirmationSigning: { chainId: 84532 } });
  if (req.url === '/.well-known/daski-chain.json') return send(200, rail);
  if (req.url === '/public/v3/services?limit=100') return send(200, catalog);
  if (req.url === `/public/v3/services/${service.serviceId}`) return send(200, service);
  if (req.url === '/public/v2/outcomes/search') return send(200, { outcomes: [] });
  if (req.url === '/outcomes/42/domain/quote') return send(200, { orderHandle: 'draft', paymentRequired: { x402Version: 2, accepts: [] } });
  // The gateway refuses on its own while paused, for anyone calling it directly.
  if (req.url === '/outcomes/42/paused/purchase') {
    return send(503, { error: { code: 'SALES_PAUSED', message: 'New sales are paused', retryable: true, paymentMayHaveSettled: false,
      requiresNewSignature: false, expected: { reason: 'Incident response', until: until.toISOString() } } }, { 'retry-after': '120' });
  }
  send(404, { error: { code: 'NOT_FOUND', message: 'Unknown fixture route' } });
});
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
await listen(gateway);
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
process.env.DASKI_NETWORK = 'testnet';
process.env.GATEWAY_URL = `http://127.0.0.1:${gateway.address().port}`;
process.env.GATEWAY_INTERNAL_URL = '';
process.env.PROMOTIONS_INTERNAL_URL = '';
const { handler } = await import('../dist/server/entry.mjs');
const site = createServer(handler);
await listen(site);
const siteUrl = `http://127.0.0.1:${site.address().port}`;
process.env.SITE_URL = siteUrl;

async function tool(name, args) {
  const response = await fetch(`${siteUrl}/mcp`, { method: 'POST', headers: {
    'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18',
  }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
  const raw = await response.text();
  assert.equal(response.status, 200, raw);
  const text = raw.startsWith('event:') || raw.startsWith('data:') ? raw.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('') : raw;
  const value = JSON.parse(text); assert.ok(value.result, text); return value.result;
}
// The words a reader sees: tags removed, whitespace collapsed.
const visibleText = html => html.replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

try {
  const paused = scenario === 'paused';
  const banner = `Sales paused Sales are paused until ${untilText}. New quotes and purchases resume then. Orders already paid continue normally. Reason: Scheduled key switch`;
  for (const path of ['/', `/service/${service.serviceId}`, `/provider/${service.providerAgentId}`, '/agents']) {
    const response = await fetch(siteUrl + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.equal(html.includes('class="dk-sales-pause"'), paused, `${path}: banner`);
    if (paused) assert.ok(visibleText(html).includes(banner), `${path} is missing: ${banner}`);
  }
  for (const path of ['/providers', '/proof', '/terms-of-use']) {
    const html = await (await fetch(siteUrl + path)).text();
    assert.ok(!html.includes('class="dk-sales-pause"'), `${path} does not lead to buying`);
  }

  const quote = await tool('daski_get_payment_challenge', { providerAgentId: '42', outcomeId: 'domain', request: { name: 'example.info' } });
  if (paused) {
    assert.equal(quote.isError, true);
    assert.equal(quote.structuredContent.code, 'SALES_PAUSED');
    assert.equal(quote.structuredContent.until, until.toISOString());
    assert.equal(quote.structuredContent.reason, 'Scheduled key switch');
    assert.ok(quote.structuredContent.retryAfterSeconds > 0);
    assert.ok(!calls.includes('/outcomes/42/domain/quote'), 'a paused quote never reaches the gateway');
  } else {
    assert.equal(quote.structuredContent.orderHandle, 'draft');
    assert.ok(calls.includes('/outcomes/42/domain/quote'));
    const refused = await tool('daski_buy_outcome', { providerAgentId: '42', outcomeId: 'paused', request: {}, paymentPayload: { fixture: true } });
    assert.equal(refused.isError, true);
    assert.equal(refused.structuredContent.code, 'SALES_PAUSED');
    assert.equal(refused.structuredContent.until, until.toISOString());
    assert.equal(refused.structuredContent.retryAfterSeconds, 120);
    assert.equal(refused.structuredContent.paymentMayHaveSettled, false);
    assert.equal(calls.filter(path => path === '/outcomes/42/paused/purchase').length, 1);
  }
  const search = await tool('daski_list_outcomes', { text: 'domain' });
  assert.deepEqual(search.structuredContent.outcomes, [], 'discovery keeps working');
  // Pages share one cached status and the MCP keeps its own: two reads at most, plus one refresh on a slow run.
  const reads = calls.filter(path => path === '/public/v1/status').length;
  assert.ok(reads >= 2 && reads <= 4, `${reads} status reads`);
  console.log(`Built website: sales ${scenario} — purchase page banners, MCP quote refusal or handoff, gateway SALES_PAUSED mapping and discovery passed.`);
} finally {
  for (const server of [site, gateway]) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { agentDocument, GUIDE_FILES, renderGuide } from '../src/lib/agentGuides.ts';
import { resolveNetworkConfig } from '../src/lib/network.ts';
import { agentPrompt, llmsText } from '../src/lib/chains.ts';

const templates = Object.fromEntries(await Promise.all(GUIDE_FILES.map(async file =>
  [file, await readFile(new URL(`../src/skills/${file}`, import.meta.url), 'utf8')])));
const config = resolveNetworkConfig({
  SITE_URL: 'https://docs.example', GATEWAY_URL: 'https://gateway.example',
  GATEWAY_INTERNAL_URL: 'http://gateway.railway.internal:8080',
});
const document = path => agentDocument(path, templates, config);

test('every guide and index describes the rendered public bytes, including aliases', async () => {
  const index = await document('/.well-known/agent-skills/index.json').json();
  assert.equal(index.skills.length, GUIDE_FILES.length);
  const contents = [];
  for (const entry of index.skills) {
    const url = new URL(entry.url);
    assert.equal(url.origin, config.siteUrl);
    const response = document(url.pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/markdown/);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    const content = await response.text();
    contents.push(content);
    assert.equal(entry.bytes, Buffer.byteLength(content));
    assert.equal(entry.sha256, createHash('sha256').update(content).digest('hex'));
    assert.equal(response.headers.get('etag'), `"${entry.sha256}"`);
    assert.doesNotMatch(content, /\{\{|railway\.internal|sandbox-gateway/);
    for (const [, href] of content.matchAll(/\]\((https:\/\/docs\.example\/skills\/[^)]+)\)/g)) {
      assert.equal(document(new URL(href).pathname).status, 200, `broken reference: ${href}`);
    }
  }
  assert.equal(await document('/llms-full.txt').text(), contents.map(value => value.trimEnd()).join('\n\n') + '\n');
  const skill = await document('/skills/SKILL.md').text();
  for (const path of ['/skill.md', '/SKILL.md', '/.well-known/skills/daski/SKILL.md']) {
    assert.equal(await document(path).text(), skill);
  }
  const legacy = await document('/.well-known/skills/index.json').json();
  assert.deepEqual(legacy.skills[0].files, ['SKILL.md']);
  assert.match(legacy.skills[0].description, /Daski/);
  assert.equal(document('/skills/unknown.md').status, 404);
  assert.equal(document('/skills/../setup.md').status, 404);
});

test('setup uses live gateway version authority and preserves the purchase and wallet guidance', async () => {
  const setup = await document('/skills/setup.md').text();
  assert.match(setup, /buyerCli\.version/);
  assert.match(setup, /https:\/\/gateway\.example\/\.well-known\/mcp\.json/);
  assert.match(setup, /npm view @daski\/pay@<buyerCli\.version> repository\.url/);
  assert.match(setup, /npm install -g @daski\/pay@<buyerCli\.version>/);
  assert.match(setup, /git\+https:\/\/github\.com\/daski-io\/buyer\.git/);
  assert.doesNotMatch(setup, /@daski\/pay@\d|@circle-fin\/cli@\d/);
  assert.match(setup, /signerClis\.circle-agent/);
  assert.match(setup, /DASKI_HOST_CLASS/);
  assert.match(setup, /DASKI_PROFILE/);
  assert.match(setup, /daski buy --provider/);
  assert.match(setup, /daski_get_payment_challenge/);
  const buy = await document('/skills/buy.md').text();
  for (const code of ['PAYMENT_IDENTIFIER_UNKNOWN', 'PAYMENT_IDENTIFIER_CONFLICT', 'SIGNATURE_COUNTERFACTUAL_REJECTED', 'CONFIRMATION_SPONSORED_REQUIRES_EOA', 'CONFIRMATION_SPONSORSHIP_LIMIT']) assert.ok(buy.includes(code));
  assert.match(await document('/skills/wallets.md').text(), /\| Circle agent wallet \| contract \|/);
  assert.match(await document('/skills/orders.md').text(), /daski order confirm <handle> --tx <hash>/);
  assert.match(await document('/skills/orders.md').text(), /--check reports the final state/);
});

test('mainnet instructions use only the configured mainnet endpoints', () => {
  const mainnet = resolveNetworkConfig({ DASKI_NETWORK: 'mainnet', GATEWAY_URL: 'https://gateway.daski.io' });
  const setup = renderGuide('setup.md', templates, mainnet);
  assert.match(setup.content, /Base \(chain ID 8453\)/);
  assert.match(setup.content, /https:\/\/gateway\.daski\.io/);
  assert.match(setup.content, /https:\/\/daski\.io\/skills\/buy\.md/);
  assert.doesNotMatch(setup.content, /sandbox|Sepolia|84532/);
  assert.notEqual(setup.sha256, renderGuide('setup.md', templates, config).sha256);
});

test('an unpublished network serves no actionable guide or skill index', async () => {
  const unavailable = resolveNetworkConfig({ DASKI_NETWORK: 'mainnet' });
  for (const path of ['/skills/setup.md', '/skills/buy.md', '/skill.md', '/llms-full.txt', '/.well-known/agent-skills/index.json', '/.well-known/skills/index.json']) {
    const response = agentDocument(path, templates, unavailable);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.text();
    assert.match(body, /not available yet/);
    assert.doesNotMatch(body, /sandbox|npm install|daski buy/);
  }
});

test('the prompt and machine-readable entry point use the configured website origin', () => {
  assert.equal(agentPrompt(config.siteUrl), 'Fetch https://docs.example/skills/setup.md and use the returned setup instructions to buy [service offered on daski]');
  const llms = llmsText(config);
  assert.match(llms, /https:\/\/docs\.example\/skills\/setup\.md/);
  assert.match(llms, /daski buy flow/);
  assert.doesNotMatch(llms, /single `daski_buy_outcome`|railway\.internal/);
});

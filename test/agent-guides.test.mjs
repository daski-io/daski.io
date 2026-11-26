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
  for (const code of ['PAYMENT_IDENTIFIER_UNKNOWN', 'PAYMENT_IDENTIFIER_CONFLICT', 'SIGNATURE_COUNTERFACTUAL_REJECTED', 'CONFIRMATION_SPONSORED_REQUIRES_EOA', 'CONFIRMATION_SPONSORSHIP_LIMIT', 'DASKI_CIRCLE_EXECUTION_NOT_QUALIFIED', 'ORDER_ACTION_UNSUPPORTED', 'ORDER_ACTION_CONFLICT', 'PROVIDER_LIFECYCLE_UNAVAILABLE', 'PAYMENT_ADMISSION_UNAVAILABLE', 'OUTCOME_CAPACITY_EXHAUSTED']) assert.ok(buy.includes(code));
  // A paid submission the gateway could not admit is resent unchanged.
  assert.match(buy, /\| PAYMENT_ADMISSION_UNAVAILABLE \| The gateway could not admit the payment right now; nothing was claimed or settled\. Wait for Retry-After \(2 seconds\), then resend the identical signed payment\./);
  // The gateway's provider refusals point their docs link at this errors table.
  assert.match(buy, /\| PROVIDER_LIFECYCLE_UNAVAILABLE \| The action may already have taken effect\. Wait for Retry-After \(10 seconds\), then retry at most three times with the identical request, keeping any requestId\. A signed action needs a fresh order-action authorization each time, because a spent one is never restored; a read capability is reused\. Then read the order status\. \|/);
  assert.match(await document('/skills/wallets.md').text(), /\| Circle agent wallet \| contract \|/);
  assert.match(await document('/skills/orders.md').text(), /daski order confirm <handle> --tx <hash>/);
  assert.match(await document('/skills/orders.md').text(), /resubmit the complete corrected request as order input/);
  assert.match(await document('/skills/orders.md').text(), /`withheld` values \(an SSN, dates of birth\) are never shown back/);
  assert.match(await document('/skills/orders.md').text(), /--check reports the final state/);
  // A Circle agent wallet reviews only through the buyer CLI, whose journal can resume and verify it.
  assert.match(await document('/skills/orders.md').text(), /sending the call\s+with `circle wallet execute` directly keeps no such record/);
  // 0.5.3 abandons a started Circle submission only after Circle reports it failed.
  assert.match(await document('/skills/orders.md').text(), /A started Circle submission can be abandoned only after Circle\s+reports its transaction FAILED, DENIED or CANCELLED/);
  // A recovery recorded on-chain is shown beside the failure, never in place of it.
  assert.match(await document('/skills/orders.md').text(), /When the provider records the recovery on-chain, beside the original Failed outcome, Daski's public reputation counts the order as completed\./);
  assert.doesNotMatch(await document('/skills/orders.md').text(), /later recovered/);
  // Some providers serve only status and artifact reads; a refused signed action stays spent.
  assert.match(await document('/skills/orders.md').text(), /some serve only status and artifact reads\. An action the provider does not offer answers `ORDER_ACTION_UNSUPPORTED` and changes nothing/);
  assert.match(await document('/skills/orders.md').text(), /A refusal never restores a spent authorization, so each retry of a signed action carries a fresh order-action authorization; a read capability is reused\./);
  assert.match(await document('/skills/orders.md').text(), /\]\(https:\/\/docs\.example\/skills\/buy\.md#errors\) for every code/);
  // An expired deadline fails the gateway order without stopping the provider's work.
  assert.match(await document('/skills/orders.md').text(), /never shorter than the duration in the order's checkout snapshot and can only grow; paused sales do not suspend it\./);
  assert.match(await document('/skills/orders.md').text(), /show `fulfillmentState: "completed"` and return the artifact while `orderState` stays `PROVIDER_FAILED`\. Only a Daski operator can revive the order\./);
});

// The one paragraph in each mainnet entry guide that routes an agent asked to use the testnet.
const TESTNET_ROUTE = /^(\*\*Asked to use the testnet\?\*\*|These guides are for Base mainnet\.) .*\n\n/m;

test('mainnet instructions use only the configured mainnet endpoints', () => {
  const mainnet = resolveNetworkConfig({ DASKI_NETWORK: 'mainnet', GATEWAY_URL: 'https://gateway.daski.io' });
  const setup = renderGuide('setup.md', templates, mainnet);
  assert.match(setup.content, /Base \(chain ID 8453\)/);
  assert.match(setup.content, /https:\/\/gateway\.daski\.io/);
  assert.match(setup.content, /https:\/\/daski\.io\/skills\/buy\.md/);
  // Outside the testnet route, neither entry guide names the testnet.
  assert.match(setup.content, TESTNET_ROUTE);
  for (const file of ['setup.md', 'SKILL.md']) {
    assert.doesNotMatch(renderGuide(file, templates, mainnet).content.replace(TESTNET_ROUTE, ''), /sandbox|Sepolia|84532|testnet/i, file);
  }
  // Every guide renders on mainnet, so a placeholder in a mainnet-only block cannot hide.
  for (const file of GUIDE_FILES) assert.doesNotMatch(renderGuide(file, templates, mainnet).content, /\{\{|MAINNET/, file);
  assert.notEqual(setup.sha256, renderGuide('setup.md', templates, config).sha256);
});

test('mainnet entry guides route an agent asked for the testnet, and keep the network stop', async () => {
  const mainnet = resolveNetworkConfig({ DASKI_NETWORK: 'mainnet', GATEWAY_URL: 'https://gateway.daski.io' });
  const setup = renderGuide('setup.md', templates, mainnet).content;
  const [route] = setup.match(TESTNET_ROUTE);
  assert.match(route, /Base Sepolia \(chain ID 84532\) that settles in test USDC only/);
  assert.match(route, /Its site is https:\/\/sandbox\.daski\.io, its MCP server `https:\/\/sandbox\.daski\.io\/mcp` and its gateway `https:\/\/sandbox-gateway\.daski\.io`\./);
  assert.match(route, /load https:\/\/sandbox\.daski\.io\/skills\/setup\.md in full and follow it instead of this guide/);
  assert.match(route, /Use the testnet only when the user asked for it, and never use one network for the other\./);
  // The route comes before the network check, which still stops on any other network.
  assert.ok(setup.indexOf(route) < setup.indexOf('If either document is unavailable or the network differs, stop and report it; do not substitute another network.'));
  assert.match(setup, /The generated mainnet profile is disabled until the user chooses that network; do not silently switch profiles or enable mainnet\./);

  const skill = renderGuide('SKILL.md', templates, mainnet).content;
  const [skillRoute] = skill.match(TESTNET_ROUTE);
  assert.match(skillRoute, /chain ID 84532, test USDC only/);
  assert.ok(skillRoute.includes('https://sandbox.daski.io/skills/SKILL.md and https://sandbox.daski.io/skills/setup.md'));
  assert.ok(skill.startsWith('---\nname: daski\n'));
  assert.match(await agentDocument('/llms-full.txt', templates, mainnet).text(), TESTNET_ROUTE);

  // An overridden testnet site moves the route with it.
  const staged = resolveNetworkConfig({ DASKI_NETWORK: 'mainnet', GATEWAY_URL: 'https://gateway.daski.io', TESTNET_SITE_URL: 'https://testnet.example' });
  assert.match(renderGuide('setup.md', templates, staged).content, /load https:\/\/testnet\.example\/skills\/setup\.md in full/);
});

test('the testnet guides carry no route to themselves and no section markers', () => {
  const testnet = resolveNetworkConfig({ DASKI_NETWORK: 'testnet' });
  for (const file of GUIDE_FILES) {
    const { content } = renderGuide(file, templates, testnet);
    assert.doesNotMatch(content, TESTNET_ROUTE, file);
    assert.doesNotMatch(content, /MAINNET|Asked to use the testnet/, file);
  }
  // Removing a block leaves the paragraphs around it as they were.
  for (const file of ['setup.md', 'SKILL.md']) {
    assert.doesNotMatch(renderGuide(file, templates, testnet).content, /\n\n\n/, file);
  }
  const broken = { ...templates, 'SKILL.md': templates['SKILL.md'].replace('{{/MAINNET}}\n', '') };
  assert.throws(() => renderGuide('SKILL.md', broken, testnet), /Unbalanced guide section in SKILL\.md/);
});

test('Circle setup preserves the selected network and stops the v2-required legacy refusal', () => {
  for (const [network, chain, flag] of [['testnet', 'BASE-SEPOLIA', ' --testnet'], ['mainnet', 'BASE', '']]) {
    const instance = resolveNetworkConfig({ DASKI_NETWORK: network, GATEWAY_URL: 'https://gateway.example' });
    const setup = renderGuide('setup.md', templates, instance).content;
    assert.ok(setup.includes(`circle wallet create${flag} --output json`));
    assert.ok(setup.includes(`circle wallet list --chain ${chain} --type agent --output json`));
    assert.doesNotMatch(setup, /CIRCLE_EXPERIMENTAL_AUTH_V2=0|--request <fresh-request-id>/);
    assert.match(setup, /Account must use the v2 authentication path/);
    assert.match(setup, /Do not retry legacy login/);
    assert.match(setup, /ordinary setup must stop here/);
    assert.match(setup, /Before requesting a login code/);
    assert.match(setup, /including expired ones/);
    assert.match(setup, /An empty list alone does not prove a failure/);
    assert.match(setup, /Login success alone is insufficient/);
    assert.match(setup, /Offline fake API tests do not prove live service acceptance/);
  }
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

test('llms.txt lists every indexed guide, so the three documents describe one set', () => {
  // The gateway listed them all before agent interface ownership moved here;
  // dropping four of the six left llms.txt disagreeing with the agent-skills
  // index and llms-full.txt, which the release preflight caught.
  const llms = llmsText(config);
  for (const file of GUIDE_FILES) {
    assert.ok(llms.includes(`${config.siteUrl}/skills/${file}`), `llms.txt omitted ${file}`);
  }
});

test('the guides end a purchase with its result in hand and introduce @daski/pay as a command-line tool', async () => {
  const setup = await document('/skills/setup.md').text();
  assert.match(setup, /6\. The purchase is done only when its result is in hand, not when the order reads `FULFILLED`\./);
  assert.match(setup, /an inference API key, for example, comes from the provider's `get-inference-key` action/);
  assert.match(setup, /never put the secret in chat or a report/);
  assert.match(setup, /`@daski\/pay` is a command-line tool, not a library: it installs the `daski` command\./);
  const buy = await document('/skills/buy.md').text();
  assert.match(buy, /## When the purchase is done\n\nPayment does not finish a purchase: it is done only when its result is in hand\./);
  assert.match(buy, /`daski` is the command-line tool that `@daski\/pay` installs\. Run it; do not import `@daski\/pay` from a script\./);
  assert.match(await document('/skills/SKILL.md').text(), /The purchase is done only when its result is in hand/);
  const llms = llmsText(config);
  assert.match(llms, /A purchase is done only when its result is in hand\./);
  assert.match(llms, /@daski\/pay, is a command-line tool, not a library/);

  const orders = await document('/skills/orders.md').text();
  const section = orders.slice(orders.indexOf('## Results behind an asset action'), orders.indexOf('## Fulfillment deadline'));
  assert.match(section, /Call `daski_list_assets` with `payer`/);
  assert.match(section, /Neither the order handle nor the `keyId` is an asset id\./);
  assert.match(section, /repeat the identical call with `authorization: \{"message": <challenge\.message>, "signature": "<signature>"\}`/);
  assert.match(section, /never put the secret in chat, a report or a log/);
  // The buyer CLI the gateway pins has no command for asset actions yet, so the
  // section names only the MCP tools. When a CLI release adds that command,
  // name it here beside daski_use_asset and update this assertion.
  assert.doesNotMatch(section, /`daski [a-z]/);
});

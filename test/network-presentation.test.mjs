import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  agentPrompt,
  assertGatewayChain,
  explorerAddress,
  explorerTx,
  llmsText,
  networkStrip,
  networkSwitchLinks,
  siteName,
  siteTitle,
} from '../src/lib/chains.ts';
import { activityView } from '../src/lib/marketplacePresentation.ts';
import { networkView, resolveNetworkConfig } from '../src/lib/network.ts';
import { parseRailMetadata } from '../src/lib/railMetadata.ts';

const ROOT = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');
const railFixture = JSON.parse(readFileSync(
  new URL('./vectors/daski-chain-v3.json', import.meta.url),
  'utf8',
));
const MAINNET_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// The three configurations an instance can run in.
const CONFIGS = {
  testnet: resolveNetworkConfig({}),
  mainnetLive: resolveNetworkConfig({
    DASKI_NETWORK: 'mainnet',
    GATEWAY_URL: 'https://gateway.daski.io',
  }),
  mainnetSoon: resolveNetworkConfig({ DASKI_NETWORK: 'mainnet' }),
};
const VIEWS = Object.fromEntries(
  Object.entries(CONFIGS).map(([name, config]) => [name, networkView(config)]),
);

function mainnetRailFixture() {
  const fixture = structuredClone(railFixture);
  fixture.chainId = 8453;
  fixture.network = 'base';
  fixture.paymentRail.network = 'eip155:8453';
  fixture.paymentRail.asset = MAINNET_USDC;
  fixture.contracts.usdc = MAINNET_USDC;
  for (const outcome of fixture.outcomes) outcome.token = MAINNET_USDC;
  return fixture;
}

test('testnet: prompt, explorer links, strip, titles and llms.txt name the sandbox', () => {
  const view = VIEWS.testnet;

  assert.equal(
    agentPrompt(view.gatewayUrl),
    'Fetch https://sandbox-gateway.daski.io/skills/setup.md and use the returned setup instructions to buy [service offered on daski]',
  );
  assert.equal(explorerTx(view.explorerUrl, '0xabc'), 'https://sepolia.basescan.org/tx/0xabc');
  assert.equal(explorerAddress(view.explorerUrl, '0xdef'), 'https://sepolia.basescan.org/address/0xdef');
  assert.deepEqual(networkStrip(view), {
    tone: 'testnet',
    kicker: 'testnet',
    message: 'You are viewing the Testnet version of Daski. Services settle in test USDC on Base Sepolia.',
    live: true,
  });
  assert.equal(siteName(view), 'Daski Testnet');
  assert.equal(siteTitle(view), 'Daski Testnet · sandbox.daski.io');

  const llms = llmsText(view);
  assert.match(llms, /The Testnet runtime uses one\nstandard x402 V2 Exact-EVM rail with canonical USDC on Base Sepolia\./);
  assert.match(llms, /`https:\/\/sandbox-gateway\.daski\.io\/mcp`/);
  assert.match(llms, /- Base Sepolia chain ID: `84532`/);
  assert.doesNotMatch(llms, /https:\/\/gateway\.daski\.io/);
});

test('mainnet live: prompt, explorer links, strip, titles and llms.txt name mainnet', () => {
  const view = VIEWS.mainnetLive;

  assert.equal(
    agentPrompt(view.gatewayUrl),
    'Fetch https://gateway.daski.io/skills/setup.md and use the returned setup instructions to buy [service offered on daski]',
  );
  assert.equal(explorerTx(view.explorerUrl, '0xabc'), 'https://basescan.org/tx/0xabc');
  assert.equal(explorerAddress(view.explorerUrl, '0xdef'), 'https://basescan.org/address/0xdef');
  assert.equal(networkStrip(view), null);
  assert.equal(siteName(view), 'Daski');
  assert.equal(siteTitle(view), 'Daski · daski.io');

  const llms = llmsText(view);
  assert.match(llms, /The Mainnet runtime uses one\nstandard x402 V2 Exact-EVM rail with canonical USDC on Base\./);
  assert.match(llms, /`https:\/\/gateway\.daski\.io\/\.well-known\/daski-chain\.json`/);
  assert.match(llms, /- Base chain ID: `8453`/);
  assert.doesNotMatch(llms, /sandbox|Sepolia|84532/);
});

test('mainnet without a gateway: launching-soon strip and an honest llms.txt', () => {
  const view = VIEWS.mainnetSoon;

  assert.equal(view.gatewayUrl, null);
  assert.deepEqual(networkStrip(view), {
    tone: 'mainnet',
    kicker: 'mainnet · launching soon',
    message: 'Mainnet launching soon. Nothing is live for purchase on Base mainnet yet.',
    live: false,
  });
  assert.equal(siteTitle(view), 'Daski · daski.io');

  const llms = llmsText(view);
  assert.match(llms, /The Mainnet runtime on\nBase \(chain ID 8453\) is not published yet/);
  assert.match(llms, /https:\/\/sandbox\.daski\.io\/llms\.txt/);
  assert.doesNotMatch(llms, /daski_buy_outcome|\/mcp/);
});

test('the header switch links to the same page on the other network, except chain-specific pages', () => {
  assert.deepEqual(networkSwitchLinks(VIEWS.testnet, '/activity'), [
    { id: 'testnet', label: 'Testnet', href: 'https://sandbox.daski.io/activity', active: true },
    { id: 'mainnet', label: 'Mainnet', href: 'https://daski.io/activity', active: false },
  ]);
  assert.deepEqual(
    networkSwitchLinks(VIEWS.mainnetLive, '/service/0xabc').map(({ href }) => href),
    ['https://sandbox.daski.io/', 'https://daski.io/service/0xabc'],
  );
  assert.deepEqual(
    networkSwitchLinks(VIEWS.mainnetSoon, '/provider/41').map(({ href }) => href),
    ['https://sandbox.daski.io/', 'https://daski.io/provider/41'],
  );
  assert.equal(networkSwitchLinks(VIEWS.mainnetSoon, '/').find(({ active }) => active).id, 'mainnet');
});

test('rail metadata from the other chain is refused and matching metadata is accepted', () => {
  const sepolia = parseRailMetadata(structuredClone(railFixture));
  const mainnet = parseRailMetadata(mainnetRailFixture());

  assert.equal(mainnet.chainId, 8453);
  assert.equal(mainnet.network, 'base');
  assert.equal(mainnet.paymentRail.network, 'eip155:8453');
  assert.equal(activityView(mainnet).chainId, 8453);
  assert.doesNotThrow(() => assertGatewayChain(mainnet.chainId, CONFIGS.mainnetLive.chainId));
  assert.doesNotThrow(() => assertGatewayChain(sepolia.chainId, CONFIGS.testnet.chainId));
  assert.throws(
    () => assertGatewayChain(sepolia.chainId, CONFIGS.mainnetLive.chainId),
    /gateway reports chain 84532, expected 8453/,
  );
  assert.throws(
    () => assertGatewayChain(mainnet.chainId, CONFIGS.testnet.chainId),
    /gateway reports chain 8453, expected 84532/,
  );
});

test('no page or component hardcodes a network', async () => {
  const paths = [
    'src/lib/api.ts',
    'src/views/ActivityPage.tsx',
    'src/views/ProviderProfilePage.tsx',
    'src/components/service/ProviderAndRailDetails.tsx',
    'src/components/AgentPromptSection.tsx',
    'src/components/home/Hero.tsx',
    'src/components/home/ServicesDirectory.tsx',
    'src/layouts/BaseLayout.astro',
    'src/pages/404.astro',
    'src/pages/activity.astro',
    'src/pages/index.astro',
    'src/pages/llms.txt.ts',
  ];
  for (const path of paths) {
    const source = await read(path);
    assert.doesNotMatch(
      source,
      /sepolia|84532|sandbox-gateway|sandbox\.daski|Daski Sandbox|Daski Testnet|basescan\.org/i,
      `${path} hardcodes a network`,
    );
  }

  const api = await read('src/lib/api.ts');
  assert.doesNotMatch(api, /PUBLIC_GATEWAY_URL/);
  assert.match(api, /assertGatewayChain\(metadata\.chainId, target\.chainId\)/);

  const header = await read('src/components/Header.tsx');
  assert.match(header, /<NetworkSwitch /);
  assert.match(header, /<NetworkStrip /);

  const layout = await read('src/layouts/BaseLayout.astro');
  assert.match(layout, /networkConfig\(\)/);
  assert.match(layout, /rel="canonical"/);
  assert.match(layout, /name="robots"/);
});

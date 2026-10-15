import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

test('publishes the provider skill integration page and hydrates its controls', async () => {
  const [page, view] = await Promise.all([
    read('src/pages/providers.astro'),
    read('src/views/ProvidersPage.tsx'),
  ]);

  assert.match(page, /<ProvidersPage client:load \/>/);
  assert.match(view, /AI agents are buying real services\./);
  assert.match(view, /Let your coding agent do the integration\./);
  assert.match(view, /--skill daski-provider -a claude-code/);
  assert.match(view, /--skill daski-provider -a codex/);
  assert.match(view, /Start from the template/);
  assert.match(view, /Join the Daski Discord/);
  assert.match(view, /icon: 'claude'/);
  assert.match(view, /icon: 'openai'/);
  assert.match(view, /icon="chat"/);

  assert.doesNotMatch(view, /Three things\./);
  assert.doesNotMatch(view, /How it works\./);
});

test('routes both provider starters through the one skill and its unchanged install commands', async () => {
  const view = await read('src/views/ProvidersPage.tsx');
  const flat = view.replace(/\s+/g, ' ');

  for (const cmd of [
    'npx skills add https://github.com/daski-io/provider --skill daski-provider -a claude-code',
    'npx skills add https://github.com/daski-io/provider --skill daski-provider -a codex',
    'npx skills add https://github.com/daski-io/provider --skill daski-provider',
  ]) assert.ok(view.includes(`cmd: '${cmd}',`), cmd);

  assert.match(flat, /Still hand-coding\? Start from this MIT-licensed template\. It covers fixed-price services that answer in one call, and services whose product runs each paid order as its own job and reports minutes or hours later\. Dynamic pricing, buyer follow-ups, cancellation, owned assets or operator review need provider-full\./);
  assert.match(view, /<ProviderLink href="https:\/\/github\.com\/daski-io\/provider">/);
  assert.match(view, /<ProviderLink href="https:\/\/github\.com\/daski-io\/provider-full">/);
  assert.match(view, /the skill to add your services to Daski\./);
  assert.doesNotMatch(view, /Checkout this|template repo|services to daski/);
});

test('says Testnet onboarding starts with Daski and Mainnet follows its review', async () => {
  const [view, seo] = await Promise.all([read('src/views/ProvidersPage.tsx'), read('src/lib/seo.ts')]);
  const flat = view.replace(/\s+/g, ' ');

  assert.match(flat, /Reach out to start onboarding on Testnet\. After we review your service there, we whitelist you for Mainnet\./);
  assert.match(view, /<ProviderLink href="https:\/\/discord\.gg\/uyeMp7Q2HW">/);
  assert.match(seo, /contact Daski for Testnet onboarding and review\./);
  assert.doesNotMatch(view + seo, /Deploy and test on Testnet|test on Testnet, and apply/);
});

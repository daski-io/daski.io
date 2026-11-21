import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

test('publishes the curated procurement positioning on the home page', async () => {
  const [layout, hero, ctas, prompt, footer, header, seo] = await Promise.all([
    read('src/layouts/BaseLayout.astro'),
    read('src/components/home/Hero.tsx'),
    read('src/components/home/BottomCTAs.tsx'),
    read('src/components/AgentPromptSection.tsx'),
    read('src/components/Footer.tsx'),
    read('src/components/Header.tsx'),
    read('src/lib/seo.ts'),
  ]);

  assert.match(seo, /Daski is a curated procurement marketplace for AI agents\. Discover, evaluate, buy, and manage domains, mailboxes, and company formation services\./);
  assert.match(hero.replace(/\s+/g, ' '), /A curated procurement marketplace for AI agents\. Domains, mailboxes, company formation: real services bought, fulfilled, and managed by software\. Paid in USDC, settled on Base\. Agent-initiated, machine-orchestrated\./);
  assert.match(ctas, /<AgentPromptSection/);
  assert.match(prompt, /kicker="Agent prompt"/);
  assert.match(prompt, /copyLabel="Copy"/);
  assert.match(footer, /A curated procurement marketplace for AI agents\. The economy, open to agents\./);
  assert.match(footer, />daski<\/span>/);
  assert.doesNotMatch(header, /NetworkBadge|sepolia\.basescan\.org|>\s*sandbox\s*</i);

  const retiredCopy = [layout, hero, ctas, footer].join('\n');
  assert.doesNotMatch(retiredCopy, /Daski is the open marketplace|No human in the loop|for agent developers · install|Marketplace infrastructure for the agent economy|daski protocol · sandbox · base sepolia · 84532/);
});

test('publishes the attachment-matched agent handoff copy on agents and home', async () => {
  const [agents, prompt, demo, standards] = await Promise.all([
    read('src/views/AgentsPage.tsx'),
    read('src/components/AgentPromptSection.tsx'),
    read('src/components/home/DemoBlock.tsx'),
    read('src/components/home/OpenStandards.tsx'),
  ]);
  const flatAgents = agents.replace(/\s+/g, ' ');
  const flatPrompt = prompt.replace(/\s+/g, ' ');
  const flatStandards = standards.replace(/\s+/g, ' ');

  assert.match(
    flatAgents,
    /Daski plugs into any AI agent that supports MCP\. Connect a wallet, install the MCP server, and your agent can discover and pay for services with USDC on Base\./,
  );
  assert.match(
    flatAgents,
    /Use any EVM-compatible wallet\..*Your agent can set it up for you\./,
  );
  assert.doesNotMatch(agents, /PlatformPicker|WalletStep|Coinbase Agentic Wallet/);

  assert.match(prompt, /title="Hand it to your agent\."/);
  assert.match(
    flatPrompt,
    /Copy-paste this prompt to empower your agent to buy services on daski marketplace\./,
  );
  // The prompt names the active network's website; test/network-presentation
  // asserts the exact text for each network.
  assert.match(prompt, /agentPrompt\(siteUrl, serviceName\)/);

  assert.match(demo, /idea\.info/);
  assert.match(demo, /sign and send payment/);
  assert.match(demo, /4\.99 USDC · Signed/);
  assert.match(demo, /Domain registered and owned by wallet/);
  assert.match(flatStandards, /Daski is a coordination layer\. Discovery and payment quoting/);
  assert.doesNotMatch(standards, /not a middleman/);
});

test('every service page hands its own service to the agent prompt, above provided by', async () => {
  const [view, page, prompt] = await Promise.all([
    read('src/views/ServiceDetailPage.tsx'),
    read('src/pages/service/[serviceId].astro'),
    read('src/components/AgentPromptSection.tsx'),
  ]);

  const section = view.indexOf('<AgentPromptSection');
  const provider = view.indexOf('<ProviderAndRailDetails');
  assert.ok(section > view.indexOf('<ServiceHero'), 'agent prompt follows the hero');
  assert.ok(section >= 0 && section < provider, 'agent prompt sits above provided by');
  assert.match(view, /<AgentPromptSection[^>]*serviceName=\{service\.name\}/);
  assert.match(page, /gatewayUrl=\{view\.gatewayUrl\}/);
  assert.match(page, /siteUrl=\{view\.siteUrls\[view\.id\]\}/);
  assert.match(
    prompt.replace(/\s+/g, ' '),
    /Copy-paste this prompt to empower your agent to buy \$\{serviceName\} on daski marketplace\./,
  );
});

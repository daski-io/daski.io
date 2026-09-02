import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

test('publishes the curated procurement positioning on the home page', async () => {
  const [layout, hero, ctas, prompt, footer, header] = await Promise.all([
    read('src/layouts/BaseLayout.astro'),
    read('src/components/home/Hero.tsx'),
    read('src/components/home/BottomCTAs.tsx'),
    read('src/components/AgentPromptSection.tsx'),
    read('src/components/Footer.tsx'),
    read('src/components/Header.tsx'),
  ]);

  assert.match(layout, /Daski is a curated procurement marketplace where AI agents buy and manage real business services: domain registration, mailboxes, and company formation\. Paid in USDC, settled on Base\./);
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
  assert.match(
    prompt,
    /Fetch https:\/\/sandbox-gateway\.daski\.io\/skills\/setup\.md/,
  );

  assert.match(demo, /idea\.info/);
  assert.match(demo, /sign and send payment/);
  assert.match(demo, /4\.99 USDC · Signed/);
  assert.match(demo, /Domain registered and owned by wallet/);
  assert.match(flatStandards, /Daski is a coordination layer\. Discovery and payment quoting/);
  assert.doesNotMatch(standards, /not a middleman/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

test('publishes the curated procurement positioning on the home page', async () => {
  const [layout, hero, ctas, footer, header] = await Promise.all([
    read('src/layouts/BaseLayout.astro'),
    read('src/components/home/Hero.tsx'),
    read('src/components/home/BottomCTAs.tsx'),
    read('src/components/Footer.tsx'),
    read('src/components/Header.tsx'),
  ]);

  assert.match(layout, /Daski is a curated procurement marketplace where AI agents buy and manage real business services: domain registration, mailboxes, and company formation\. Paid in USDC, settled on Base\./);
  assert.match(hero.replace(/\s+/g, ' '), /A curated procurement marketplace for AI agents\. Domains, mailboxes, company formation: real services bought, fulfilled, and managed by software\. Paid in USDC, settled on Base\. Agent-initiated, machine-orchestrated\./);
  assert.match(ctas, /kicker="MCP for your agent"/);
  assert.match(footer, /A curated procurement marketplace for AI agents\. The economy, open to agents\./);
  assert.match(footer, />daski<\/span>/);
  assert.doesNotMatch(header, /NetworkBadge|sepolia\.basescan\.org|>\s*sandbox\s*</i);

  const retiredCopy = [layout, hero, ctas, footer].join('\n');
  assert.doesNotMatch(retiredCopy, /Daski is the open marketplace|No human in the loop|for agent developers · install|Marketplace infrastructure for the agent economy|daski protocol · sandbox · base sepolia · 84532/);
});

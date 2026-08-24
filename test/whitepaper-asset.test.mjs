import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const CANONICAL_PATH = '/agentic-procurement-protocol-whitepaper.pdf';
const LEGACY_PATH = '/MarketplaceProtocolWhitePaper.pdf';
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

test('publishes the whitepaper under its canonical protocol filename', async () => {
  await access(new URL(`public${CANONICAL_PATH}`, ROOT));
  await assert.rejects(
    access(new URL(`public${LEGACY_PATH}`, ROOT)),
    { code: 'ENOENT' },
  );

  const [readme, footer] = await Promise.all([
    read('README.md'),
    read('src/components/Footer.tsx'),
  ]);
  assert.match(readme, new RegExp(CANONICAL_PATH));
  assert.match(footer, new RegExp(CANONICAL_PATH));
});

test('redirects the established whitepaper URL to the canonical filename', async () => {
  const config = await read('astro.config.mjs');
  assert.match(config, new RegExp(`['\"]${LEGACY_PATH.replaceAll('.', '\\.')}['\"]`));
  assert.match(config, new RegExp(`destination: ['\"]${CANONICAL_PATH.replaceAll('.', '\\.')}['\"]`));
  assert.match(config, /status: 301/);
});

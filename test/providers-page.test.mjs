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

  assert.doesNotMatch(view, /Three things\./);
  assert.doesNotMatch(view, /How it works\./);
});

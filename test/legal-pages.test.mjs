import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

const LEGAL_PAGES = [
  {
    name: 'Terms of Use',
    body: 'src/content/legal/terms-of-use.md',
    page: 'src/pages/terms-of-use.astro',
    canonicalUrl: 'https://daski.io/terms-of-use',
    sectionCount: 22,
  },
  {
    name: 'Privacy Policy',
    body: 'src/content/legal/privacy-policy.md',
    page: 'src/pages/privacy-policy.astro',
    canonicalUrl: 'https://daski.io/privacy-policy',
    sectionCount: 17,
  },
];

test('publishes approved legal metadata once through the shared layout', async () => {
  const layout = await read('src/layouts/LegalLayout.astro');
  assert.equal(layout.match(/<h1>/g)?.length, 1);
  assert.match(layout, /<dt>Version<\/dt>/);
  assert.match(layout, /<dt>Effective date<\/dt>/);

  for (const legalPage of LEGAL_PAGES) {
    const [body, page] = await Promise.all([
      read(legalPage.body),
      read(legalPage.page),
    ]);

    assert.doesNotMatch(body, /^# /m, `${legalPage.name} body must not duplicate the page H1`);
    assert.doesNotMatch(body, /^\*\*(Version|Effective date|Marketplace operator|Controller):\*\*/m);
    assert.equal(body.match(/^## /gm)?.length, legalPage.sectionCount);
    assert.match(page, new RegExp(`canonicalUrl="${legalPage.canonicalUrl}"`));
    assert.equal(page.match(/effectiveDate="July 14, 2026"/g)?.length, 1);
  }
});

test('links both canonical legal routes from the global footer', async () => {
  const footer = await read('src/components/Footer.tsx');
  assert.match(footer, /<a href="\/terms-of-use">Terms of Use<\/a>/);
  assert.match(footer, /<a href="\/privacy-policy">Privacy Policy<\/a>/);
});

test('exposes marketplace and provider legal links on service details', async () => {
  const [api, serviceDetail] = await Promise.all([
    read('src/lib/api.ts'),
    read('src/views/ServiceDetailPage.tsx'),
  ]);

  for (const field of [
    'marketplaceTermsUrl',
    'marketplacePrivacyUrl',
    'providerLegalName',
    'providerTermsUrl',
    'providerPrivacyUrl',
  ]) {
    assert.match(api, new RegExp(`${field}: string`));
    assert.match(serviceDetail, new RegExp(`service\\.legal\\.${field}`));
  }
});

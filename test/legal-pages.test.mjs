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
    sectionCount: 23,
    version: '1.3',
    effectiveDate: 'November 21, 2026',
  },
  {
    name: 'Privacy Policy',
    body: 'src/content/legal/privacy-policy.md',
    page: 'src/pages/privacy-policy.astro',
    canonicalUrl: 'https://daski.io/privacy-policy',
    sectionCount: 17,
    version: '1.3',
    effectiveDate: 'November 21, 2026',
  },
  {
    name: 'Hosted Provider Terms',
    body: 'src/content/legal/hosted-provider-terms.md',
    page: 'src/pages/hosted-provider-terms.astro',
    canonicalUrl: 'https://daski.io/hosted-provider-terms',
    sectionCount: 16,
    version: '1.0',
    effectiveDate: 'November 21, 2026',
  },
];

test('renders legal revision metadata once through the shared layout', async () => {
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
    assert.equal(page.match(new RegExp(`version="${legalPage.version.replace('.', '\\.')}"`, 'g'))?.length, 1);
    assert.equal(page.match(/effectiveDate="[^"]+"/g)?.length, 1);
    assert.ok(page.includes(`effectiveDate="${legalPage.effectiveDate}"`));
  }
});

test('links every canonical legal route from the global footer', async () => {
  const footer = await read('src/components/Footer.tsx');
  assert.match(footer, /<a href="\/terms-of-use">Terms of Use<\/a>/);
  assert.match(footer, /<a href="\/privacy-policy">Privacy Policy<\/a>/);
  assert.match(footer, /<a href="\/hosted-provider-terms">Hosted Provider Terms<\/a>/);
});

test('discloses hosted provider signing, delivery, returns, default terms and data', async () => {
  const [terms, privacy, hosted] = await Promise.all([
    read('src/content/legal/terms-of-use.md'),
    read('src/content/legal/privacy-policy.md'),
    read('src/content/legal/hosted-provider-terms.md'),
  ]);
  assert.match(terms, /are the Hosted Provider's statements, not Daski's/);
  assert.match(terms, /Daski does not review or verify the work or the delivery/);
  assert.match(terms, /Daski's commission is not refunded/);
  assert.match(terms, /### Default terms for Hosted Provider Services/);
  assert.match(terms, /governed by the Hosted Provider Terms\./);
  assert.match(hosted, /You appoint Daski to use the Hosted Key for you and in your name, and only to:/);
  assert.match(hosted, /The Hosted Key cannot move your funds, change where you are paid, or transfer your identity\./);
  assert.match(hosted, /within 7 days/);
  assert.match(hosted, /Each buyer of your services may enforce the return obligation directly against you\./);
  assert.match(privacy, /### Hosted Provider console assistant/);
  assert.match(privacy, /It does not describe artificial intelligence, inference, or other services that Providers offer to buyers/);
  assert.match(privacy, /Hosted Provider console assistant conversations are kept for twelve months from each message and then deleted/);
  assert.match(privacy, /the order record of a Hosted Provider order/);
  assert.match(privacy, /is kept indefinitely with the order/);
  assert.match(privacy, /This subsection is Daski's notice that conversations with the assistant are recorded/);
  assert.match(hosted, /\*\*You accept these Hosted Terms by using the Console: by signing in to it/);
  assert.match(hosted, /There is no separate acceptance step\./);
  assert.match(hosted, /is kept indefinitely as the order's history/);
  assert.match(hosted, /within 7 days after the failure is recorded/);
  assert.match(terms, /within 7 days after the failure is recorded/);
  assert.match(privacy, /deleted 90 days after the order ends/);
});

test('discloses direct-transfer and post-payment identity review consequences', async () => {
  const [terms, privacy] = await Promise.all([
    read('src/content/legal/terms-of-use.md'),
    read('src/content/legal/privacy-policy.md'),
  ]);
  assert.match(terms, /outside the exact signed HTTP 402 purchase flow is not a Daski purchase/);
  assert.match(terms, /complete identity, business, sanctions, eligibility, or other compliance review after payment/);
  assert.match(privacy, /post-payment identity, business, eligibility, sanctions, or similar review/);
});

test('discloses promotion cash back as a Daski-funded payment, not a refund', async () => {
  const [terms, privacy] = await Promise.all([
    read('src/content/legal/terms-of-use.md'),
    read('src/content/legal/privacy-policy.md'),
  ]);
  assert.match(terms, /Cash back is a separate payment funded by Daski\. It is not a refund/);
  assert.match(terms, /A promotion page may also list each qualifying order's settlement transaction and its cash back transaction\./);
  assert.match(terms, /apparent demand, or promotion eligibility\./);
  assert.match(terms, /the terms of any promotion that applies, and Daski policies expressly incorporated/);
  assert.match(privacy, /run promotions, including checking eligibility, sending cash back/);
  assert.match(privacy, /A promotion page may list each qualifying order's settlement transaction and its cash back transaction, without names\./);
});

test('exposes marketplace and provider legal links on service details', async () => {
  const [api, serviceDetail, providerDetails] = await Promise.all([
    read('src/lib/api.ts'),
    read('src/views/ServiceDetailPage.tsx'),
    read('src/components/service/ProviderAndRailDetails.tsx'),
  ]);
  const servicePresentation = `${serviceDetail}\n${providerDetails}`;

  for (const field of [
    'marketplaceTermsUrl',
    'marketplacePrivacyUrl',
    'providerLegalName',
    'providerTermsUrl',
    'providerPrivacyUrl',
  ]) {
    assert.match(api, new RegExp(`${field}: string`));
    assert.match(servicePresentation, new RegExp(`service\\.legal\\.${field}`));
  }
});

test('links gateway-supplied provider details without a secondary card lookup', async () => {
  const [api, providerDetails] = await Promise.all([
    read('src/lib/api.ts'),
    read('src/components/service/ProviderAndRailDetails.tsx'),
  ]);
  assert.match(api, /agentCardUrl: httpsUrl\(item\.agentCardUrl/);
  assert.doesNotMatch(api, /parseProviderAgentUri|fetchProviderCard/);
  assert.match(providerDetails, /href=\{service\.agentCardUrl\}>Service card<\/ExternalLink>/);
  assert.match(api, /export function providerPath/);
  assert.match(providerDetails, /href=\{providerPath\(service\)\}>Provider details<\/InternalLink>/);
  assert.doesNotMatch(providerDetails, /Provider origin/);
  assert.ok(
    providerDetails.indexOf('>Service card</ExternalLink>')
      < providerDetails.indexOf('>Provider Terms</ExternalLink>'),
    'Service card must appear before Provider Terms',
  );
  assert.doesNotMatch(providerDetails, /Contracting party:/);
});

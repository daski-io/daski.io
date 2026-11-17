import assert from 'node:assert/strict';
import test from 'node:test';
import { providerOwnsLegalPages, samePage } from '../src/lib/legalLinks.ts';

const legal = (providerTermsUrl, providerPrivacyUrl) => ({
  marketplaceTermsUrl: 'https://daski.io/terms-of-use',
  marketplacePrivacyUrl: 'https://daski.io/privacy-policy',
  providerLegalName: 'Example Ltd',
  providerTermsUrl,
  providerPrivacyUrl,
});

test('names the same page whatever the trailing slash, never another origin, path or query', () => {
  assert.equal(samePage('https://daski.io/terms-of-use', 'https://daski.io/terms-of-use/'), true);
  assert.equal(samePage('https://daski.io/terms-of-use#top', 'https://daski.io/terms-of-use'), true);
  assert.equal(samePage('https://daski.io/terms-of-use', 'https://sandbox.daski.io/terms-of-use'), false);
  assert.equal(samePage('https://daski.io/terms-of-use', 'https://daski.io/terms'), false);
  assert.equal(samePage('https://daski.io/terms-of-use?v=2', 'https://daski.io/terms-of-use'), false);
  assert.equal(samePage('not a url', 'https://daski.io/terms-of-use'), false);
});

test("tells a provider's own pages from Daski's in their place, each on its own", () => {
  assert.deepEqual(providerOwnsLegalPages(legal('https://shop.example/terms', 'https://shop.example/privacy')), { terms: true, privacy: true });
  assert.deepEqual(providerOwnsLegalPages(legal('https://daski.io/terms-of-use', 'https://daski.io/privacy-policy/')), { terms: false, privacy: false });
  assert.deepEqual(providerOwnsLegalPages(legal('https://shop.example/terms', 'https://daski.io/privacy-policy')), { terms: true, privacy: false });
});

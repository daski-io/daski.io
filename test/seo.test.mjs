import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseServiceIndex } from '../src/lib/api.ts';
import { resolveNetworkConfig } from '../src/lib/network.ts';
import { canonicalPageUrl, descriptionExcerpt, homeDescription, sitemapXml } from '../src/lib/seo.ts';

const fixture = JSON.parse(await readFile(new URL('./vectors/public-v3-services.json', import.meta.url), 'utf8'));
const { services } = parseServiceIndex(fixture);

test('canonical URLs drop trailing slashes and cannot select a different origin', () => {
  assert.equal(canonicalPageUrl('/agents/', 'https://daski.io'), 'https://daski.io/agents');
  assert.equal(canonicalPageUrl('/', 'https://daski.io'), 'https://daski.io/');
  assert.equal(new URL(canonicalPageUrl('/\\other.example/path', 'https://daski.io')).origin, 'https://daski.io');
  assert.equal(canonicalPageUrl('//other.example/path', 'https://daski.io'), 'https://daski.io/other.example/path');
});

test('description excerpts collapse paragraphs and break on a word boundary', () => {
  assert.equal(descriptionExcerpt('  Real services.\n\tClear terms.  '), 'Real services. Clear terms.');
  const text = 'Discover services and compare provider terms. '.repeat(12);
  const excerpt = descriptionExcerpt(text);
  assert.ok(excerpt.length <= 160);
  assert.ok(excerpt.endsWith('…'));
  assert.ok(text.startsWith(excerpt.slice(0, -1)));
  assert.equal(text[excerpt.length - 1], ' ');
  assert.equal(descriptionExcerpt('x'.repeat(200)).length, 160);
});

test('home descriptions distinguish available mainnet, sandbox and prelaunch', () => {
  assert.match(homeDescription({ id: 'mainnet', gatewayUrl: 'https://gateway.example' }), /buy, and manage/);
  assert.match(homeDescription({ id: 'testnet', gatewayUrl: 'https://gateway.example' }), /test USDC on Base Sepolia/);
  assert.match(homeDescription({ id: 'mainnet', gatewayUrl: null }), /purchasing is not available yet/);
});

test('sitemap uses catalog IDs, deduplicates providers, and lists canonical content only', () => {
  const network = resolveNetworkConfig({ DASKI_NETWORK: 'mainnet' });
  const xml = sitemapXml(network, [...services, ...services]);
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.includes('https://daski.io/'));
  assert.ok(urls.includes('https://daski.io/terms-of-use'));
  assert.ok(urls.includes('https://daski.io/privacy-policy'));
  assert.ok(urls.includes('https://daski.io/agentic-procurement-protocol-whitepaper.pdf'));
  for (const service of services) {
    assert.ok(urls.includes(`https://daski.io/service/${service.serviceId}`));
    assert.ok(urls.includes(`https://daski.io/provider/${service.providerAgentId}`));
  }
  assert.doesNotMatch(xml, /lastmod|priority|changefreq|\/404|\/mcp|health\/ready/);
  const sandbox = sitemapXml(resolveNetworkConfig({}), services);
  assert.doesNotMatch(sandbox, /<loc>https:\/\/daski.io\//);
  assert.doesNotMatch(sandbox, /privacy-policy|terms-of-use/);
  const hidden = sitemapXml(resolveNetworkConfig({ SITE_ROBOTS: 'noindex' }), services);
  assert.doesNotMatch(hidden, /<loc>/);
});

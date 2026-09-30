import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Validate the first-byte HTML and actual public assets, using an offline
// catalog. Each environment gets a fresh process, like a deployed instance.
const scenario = process.argv[2];
if (!scenario) {
  for (const name of ['mainnet', 'testnet', 'noindex', 'prelaunch', 'outage']) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), name], { stdio: 'inherit', timeout: 30_000 });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Metadata scenario ${name} failed`);
  }
  process.exit(0);
}

const fixture = JSON.parse(await readFile(new URL('../test/vectors/public-v3-services.json', import.meta.url), 'utf8'));
const rail = JSON.parse(await readFile(new URL('../test/vectors/daski-chain-v3.json', import.meta.url), 'utf8'));
if (scenario !== 'testnet') {
  rail.chainId = 8453;
  rail.network = 'base';
  rail.paymentRail.network = 'eip155:8453';
}
const service = fixture.services[0];
const missingId = `0x${'00'.repeat(32)}`;
const unavailableId = `0x${'11'.repeat(32)}`;
// Ensure quote escaping and paragraph normalization are exercised in real HTML.
service.description = 'Research & analysis for "samples".\n' + 'Detailed findings and documented methods. '.repeat(8);
const gateway = createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/.well-known/daski-chain.json') { res.end(JSON.stringify(rail)); return; }
  if (scenario === 'outage' || req.url.endsWith(unavailableId)) {
    res.writeHead(503); res.end(JSON.stringify({ error: 'temporarily unavailable' })); return;
  }
  if (req.url === '/public/v3/services?limit=100') { res.end(JSON.stringify(fixture)); return; }
  if (req.url === `/public/v3/services/${service.serviceId}`) { res.end(JSON.stringify(service)); return; }
  res.writeHead(404); res.end(JSON.stringify({ error: 'not found' }));
});
const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
await listen(gateway);
const origin = scenario === 'testnet' ? 'https://sandbox.daski.io' : scenario === 'noindex' ? 'https://preview.example' : 'https://daski.io';
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
process.env.DASKI_NETWORK = scenario === 'testnet' ? 'testnet' : 'mainnet';
process.env.SITE_URL = origin;
process.env.SITE_ROBOTS = scenario === 'noindex' ? 'noindex' : 'index';
process.env.GATEWAY_URL = scenario === 'prelaunch' ? '' : `http://127.0.0.1:${gateway.address().port}`;
process.env.GATEWAY_INTERNAL_URL = '';
process.env.NETWORK_NOTICE = '';
const { handler } = await import('../dist/server/entry.mjs');
const site = createServer(handler);
await listen(site);
const local = `http://127.0.0.1:${site.address().port}`;
const decode = text => text.replace(/&#(?:x([0-9a-f]+)|(\d+));|&(amp|quot|lt|gt|apos);/gi, (_all, hex, dec, named) => {
  if (hex || dec) return String.fromCodePoint(parseInt(hex ?? dec, hex ? 16 : 10));
  return { amp: '&', quot: '"', lt: '<', gt: '>', apos: "'" }[named.toLowerCase()];
});
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, decode(value)]));
async function page(path, status = 200) {
  const response = await fetch(local + path);
  assert.equal(response.status, status, path);
  const html = await response.text();
  const head = html.split('</head>')[0];
  const titles = [...head.matchAll(/<title>(.*?)<\/title>/gs)];
  assert.equal(titles.length, 1, path);
  const title = decode(titles[0][1]);
  assert.doesNotMatch(title, /daski\.io|Daski.*Daski/i, path);
  const tags = [...head.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => attributes(tag));
  const meta = key => {
    const found = tags.filter(tag => (tag.name ?? tag.property) === key);
    assert.equal(found.length, 1, `${path}: ${key}`);
    return found[0].content;
  };
  const description = meta('description');
  assert.ok(description.length > 0 && description.length <= 160, path);
  assert.doesNotMatch(description, /[\n\t]/, path);
  assert.equal(meta('og:title'), title, path);
  assert.equal(meta('twitter:title'), title, path);
  assert.equal(meta('og:description'), description, path);
  assert.equal(meta('twitter:description'), description, path);
  assert.equal(meta('og:type'), 'website');
  assert.equal(meta('og:site_name'), scenario === 'testnet' ? 'Daski Testnet' : 'Daski');
  assert.equal(meta('twitter:card'), 'summary_large_image');
  const canonical = [...head.matchAll(/<link\b[^>]*>/g)].map(([tag]) => attributes(tag)).filter(tag => tag.rel === 'canonical');
  assert.equal(canonical.length, 1, path);
  assert.equal(meta('og:url'), canonical[0].href, path);
  assert.equal(new URL(canonical[0].href).search, '', path);
  const imageUrl = meta('og:image');
  assert.equal(new URL(imageUrl).origin, origin, path);
  assert.equal(meta('twitter:image'), imageUrl, path);
  assert.equal(meta('og:image:type'), 'image/png');
  assert.equal(meta('og:image:width'), '1200');
  assert.equal(meta('og:image:height'), '630');
  assert.equal(meta('twitter:image:alt'), meta('og:image:alt'));
  assert.match(meta('og:image:alt'), /The economy, open to agents/);
  assert.equal(meta('robots'), status >= 400 || scenario === 'noindex' ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  if (status === 503) assert.equal(response.headers.get('retry-after'), '60');
  return { title, description, canonical: canonical[0].href, imageUrl, head };
}

try {
  const home = await page('/?utm_source=preview');
  assert.equal(home.canonical, origin + '/');
  const jsonLd = JSON.parse(home.head.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]);
  assert.equal(jsonLd['@type'], 'WebSite');
  assert.equal(jsonLd.url, origin + '/');
  assert.equal(jsonLd.name, scenario === 'testnet' ? 'Daski Testnet' : 'Daski');
  if (scenario === 'prelaunch') assert.match(home.description, /not available yet/);
  if (scenario === 'testnet') assert.match(home.description, /test USDC/);
  const titles = new Set([home.title]);
  const descriptions = new Set([home.description]);
  for (const path of ['/agents', '/providers', '/activity', '/proof', '/brand-assets', '/terms-of-use', '/privacy-policy']) {
    const result = await page(path);
    assert.ok(!titles.has(result.title), `Duplicate title: ${path}`);
    assert.ok(!descriptions.has(result.description), `Duplicate description: ${path}`);
    titles.add(result.title); descriptions.add(result.description);
    assert.equal(result.canonical, `${['/terms-of-use', '/privacy-policy'].includes(path) ? 'https://daski.io' : origin}${path}`);
  }
  const agents = await page('/agents/?utm_source=preview');
  assert.equal(agents.canonical, origin + '/agents');
  const image = await fetch(local + new URL(home.imageUrl).pathname);
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /^image\/png/);
  const png = Buffer.from(await image.arrayBuffer());
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 1_000_000);

  await page('/this-page-does-not-exist', 404);
  await page('/404', 404);
  await page('/service/invalid', 404);
  await page('/provider/invalid', 404);
  if (scenario !== 'prelaunch' && scenario !== 'outage') {
    const detail = await page(`/service/${service.serviceId}`);
    assert.equal(detail.title, `${service.name} · Daski${scenario === 'testnet' ? ' Testnet' : ''}`);
    assert.match(detail.description, /^Research & analysis for "samples"\./);
    const provider = await page(`/provider/${service.providerAgentId}`);
    assert.match(provider.title, /services and reputation/);
    await page(`/service/${missingId}`, 404);
    await page('/provider/999999999', 404);
    await page(`/service/${unavailableId}`, 503);
  } else {
    const status = scenario === 'prelaunch' ? 404 : 503;
    await page(`/service/${service.serviceId}`, status);
    await page(`/provider/${service.providerAgentId}`, status);
  }
  const robots = await (await fetch(local + '/robots.txt')).text();
  const sitemap = await fetch(local + '/sitemap.xml');
  if (scenario === 'outage') {
    assert.equal(sitemap.status, 503);
    assert.equal(sitemap.headers.get('retry-after'), '60');
    assert.equal(sitemap.headers.get('cache-control'), 'no-store');
  } else {
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get('content-type'), /^application\/xml/);
    const xml = await sitemap.text();
    if (scenario === 'noindex') {
      assert.doesNotMatch(robots, /Sitemap:/);
      assert.doesNotMatch(xml, /<loc>/);
      assert.equal(sitemap.headers.get('x-robots-tag'), 'noindex');
    } else {
      assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
      const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => decode(match[1]));
      assert.equal(new Set(urls).size, urls.length);
      for (const url of urls) {
        assert.equal(new URL(url).origin, origin);
        assert.equal((await fetch(local + new URL(url).pathname)).status, 200, url);
      }
      if (scenario === 'prelaunch') assert.doesNotMatch(xml, /\/service\/|\/provider\//);
      else {
        assert.ok(urls.includes(`${origin}/service/${service.serviceId}`));
        assert.ok(urls.includes(`${origin}/provider/${service.providerAgentId}`));
      }
    }
  }
  console.log(`Built website metadata: ${scenario} — pages, social image, canonical URLs, indexing and status codes passed.`);
} finally {
  for (const server of [site, gateway]) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

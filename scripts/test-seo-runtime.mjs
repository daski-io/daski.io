import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Validate the first-byte HTML and actual public assets, using an offline
// catalog. Each environment gets a fresh process, like a deployed instance.
// The promotions scenarios add an offline promotions service.
const scenario = process.argv[2];
if (!scenario) {
  for (const name of ['mainnet', 'testnet', 'noindex', 'prelaunch', 'outage', 'promotions', 'promotions-testnet']) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), name], { stdio: 'inherit', timeout: 30_000 });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Metadata scenario ${name} failed`);
  }
  process.exit(0);
}
const testnet = scenario === 'testnet' || scenario === 'promotions-testnet';
const promotions = scenario === 'promotions' || scenario === 'promotions-testnet';

const fixture = JSON.parse(await readFile(new URL('../test/vectors/public-v3-services.json', import.meta.url), 'utf8'));
const rail = JSON.parse(await readFile(new URL('../test/vectors/daski-chain-v3.json', import.meta.url), 'utf8'));
if (!testnet) {
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

// The offline promotions service: the launch vector plus one promotion per
// page state, on this network's chain, refreshed moments ago unless delayed.
const vector = JSON.parse(await readFile(new URL('../test/vectors/promotion-launch.json', import.meta.url), 'utf8'));
const chainId = testnet ? 84532 : 8453;
const hash = seed => `0x${createHash('sha256').update(seed).digest('hex')}`;
const held = (sent, inProgress) => ({
  sent, inProgress, open: vector.spots - sent - inProgress,
  rows: Array.from({ length: sent + inProgress }, (_, index) => ({
    spot: index + 1,
    status: index < sent ? 'sent' : 'in_progress',
    orderTx: hash(`order-${index}`),
    cashbackTx: index < sent ? hash(`cash-back-${index}`) : null,
    cashbackAtomic: '10000000',
  })),
});
const STATES = {
  launch: () => ({}),
  'full-sample': () => ({ name: 'Full sample', status: 'full', ...held(20, 5) }),
  'scheduled-sample': () => ({ name: 'Scheduled sample', status: 'scheduled', ...held(0, 0), startsAt: '2027-02-01T00:00:00Z', endsAt: '2027-03-01T00:00:00Z' }),
  'ended-sample': () => ({ name: 'Ended sample', status: 'ended', ...held(9, 1) }),
  'finished-sample': () => ({ name: 'Finished sample', status: 'finished', ...held(10, 0) }),
  'paused-sample': () => ({ name: 'Paused sample', paused: true }),
  'delayed-sample': () => ({ name: 'Delayed sample', refreshedAt: new Date(Date.now() - 14 * 60_000 - 5_000).toISOString() }),
};
const promotionView = id => ({
  ...structuredClone(vector), id, chainId, refreshedAt: new Date(Date.now() - 5_000).toISOString(), ...STATES[id](),
});
const promotionRequests = [];
const promotionsService = createServer((req, res) => {
  promotionRequests.push(req.url);
  const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.url === '/v1/promotions') {
    send(200, { promotions: Object.keys(STATES).map(promotionView).map(({ id, name, status, paused, startsAt, endsAt }) => ({ id, name, status, paused, startsAt, endsAt })) });
    return;
  }
  if (req.url === '/v1/promotions/current') { send(200, promotionView('launch')); return; }
  const id = /^\/v1\/promotions\/([^/?]+)$/.exec(req.url)?.[1];
  if (id === 'broken') { send(500, { error: 'internal' }); return; }
  if (id === 'other-chain') { send(200, { ...promotionView('launch'), id, chainId: testnet ? 8453 : 84532 }); return; }
  if (id && Object.hasOwn(STATES, id)) { send(200, promotionView(id)); return; }
  send(404, { error: 'not found' });
});

const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
await listen(gateway);
if (promotions) await listen(promotionsService);
const promotionsOrigin = promotions ? `http://127.0.0.1:${promotionsService.address().port}` : null;
const origin = testnet ? 'https://sandbox.daski.io' : scenario === 'noindex' ? 'https://preview.example' : 'https://daski.io';
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
process.env.DASKI_NETWORK = testnet ? 'testnet' : 'mainnet';
process.env.SITE_URL = origin;
process.env.SITE_ROBOTS = scenario === 'noindex' ? 'noindex' : 'index';
process.env.GATEWAY_URL = scenario === 'prelaunch' ? '' : `http://127.0.0.1:${gateway.address().port}`;
process.env.GATEWAY_INTERNAL_URL = '';
process.env.NETWORK_NOTICE = '';
process.env.PROMOTIONS_INTERNAL_URL = promotionsOrigin ?? '';
const { handler } = await import('../dist/server/entry.mjs');
const site = createServer(handler);
await listen(site);
const local = `http://127.0.0.1:${site.address().port}`;
const decode = text => text.replace(/&#(?:x([0-9a-f]+)|(\d+));|&(amp|quot|lt|gt|apos);/gi, (_all, hex, dec, named) => {
  if (hex || dec) return String.fromCodePoint(parseInt(hex ?? dec, hex ? 16 : 10));
  return { amp: '&', quot: '"', lt: '<', gt: '>', apos: "'" }[named.toLowerCase()];
});
// The words a reader sees: scripts, styles and tags removed, whitespace collapsed.
const visibleText = html => decode(html
  .replace(/<script\b[\s\S]*?<\/script>/g, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' '))
  .replace(/\s+/g, ' ')
  .replace(/ ([.,])/g, '$1');
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
  assert.equal(meta('og:site_name'), testnet ? 'Daski Testnet' : 'Daski');
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
  return { title, description, canonical: canonical[0].href, imageUrl, head, html };
}

try {
  const home = await page('/?utm_source=preview');
  assert.equal(home.canonical, origin + '/');
  const jsonLd = JSON.parse(home.head.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]);
  assert.equal(jsonLd['@type'], 'WebSite');
  assert.equal(jsonLd.url, origin + '/');
  assert.equal(jsonLd.name, testnet ? 'Daski Testnet' : 'Daski');
  if (scenario === 'prelaunch') assert.match(home.description, /not available yet/);
  if (testnet) assert.match(home.description, /test USDC/);
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
    assert.equal(detail.title, `${service.name} · Daski${testnet ? ' Testnet' : ''}`);
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

  // There is no /promo index, whether or not promotions are configured.
  for (const path of ['/promo', '/promo/']) assert.match((await page(path, 404)).title, /^Page not found/);
  if (!promotions) {
    // Without PROMOTIONS_INTERNAL_URL no promotion page exists and nothing links to one.
    assert.match((await page('/promo/launch', 404)).title, /^Page not found/);
    assert.equal((await fetch(local + '/promo/launch.json')).status, 404);
    assert.doesNotMatch(home.html, /href="\/promo\//);
    assert.doesNotMatch(await (await fetch(local + '/llms.txt')).text(), /\/promo\//);
  } else {
    const launch = await page('/promo/launch');
    assert.equal(launch.title, `Launch promotion · Daski${testnet ? ' Testnet' : ''}`);
    assert.equal(
      launch.description,
      'Launch promotion: 100% cash back in USDC on your first eligible Daski order, up to 10 USDC. 25 spots, Oct 21, 2026 to Dec 31, 2026 UTC.',
    );
    assert.equal(launch.canonical, `${origin}/promo/launch`);
    assert.ok(!titles.has(launch.title) && !descriptions.has(launch.description), 'Duplicate promotion metadata');
    const text = visibleText(launch.html);
    for (const copy of [
      `promotions · cash back${testnet ? ' · testnet' : ''} Launch promotion Get USDC cash back on your first order`,
      /Active Updated \ds ago/,
      'Buy an eligible service on Daski. When the provider completes your first order, Daski sends 100% of the amount you paid back to the wallet that paid, up to 10 USDC.',
      'Starts Oct 21, 2026, 00:00 UTC Ends Dec 31, 2026, 23:59 UTC Applies to Create mailbox · Agent Mailbox Register domain · Domain Management Browse services',
      'cash back 100% back of the order total per wallet Up to 10 USDC first completed order only spots 20 of 25 spots left 3 sent · 2 in progress',
      'Spot Status Qualifying order Cash back 01 Sent',
      '03 Sent — — 04 In progress',
      'Pending',
      'All cash back is sent from 0x04bf…2039',
      'how it works Three steps, no claim form. 01 Buy an eligible service Place your first order on Daski with one of the eligible offers.',
      'Provider completes the order Your spot is held while the order is in progress.',
      `USDC arrives in the paying wallet Cash back is sent on ${testnet ? 'Base Sepolia' : 'Base'}, usually within 60 minutes.`,
      ...vector.terms,
      'These terms apply in addition to the Daski Terms of Use.',
    ]) assert.ok(copy instanceof RegExp ? copy.test(text) : text.includes(copy), `/promo/launch is missing: ${copy}`);
    assert.doesNotMatch(text, /\b(refunds?|refunded|free|guaranteed?)\b/i);
    assert.equal(text.includes('Real cash back applies only to Mainnet orders on daski.io.'), testnet);
    const explorer = testnet ? 'https://sepolia.basescan.org' : 'https://basescan.org';
    for (const link of [`${explorer}/tx/${vector.rows[0].orderTx}`, `${explorer}/tx/${vector.rows[0].cashbackTx}`, `${explorer}/address/${vector.payoutWallet}`]) {
      assert.ok(launch.html.includes(`href="${link}"`), link);
    }
    assert.match(launch.html, /role="img" aria-label="3 sent, 2 in progress, 20 open, of 25 spots\."/);
    assert.ok(launch.html.includes('href="/service/0x104fa57de606a6240af6ce05ce1af7a6cac8b454483dd0e734e353ce6095dce4"'));
    assert.ok(launch.html.includes('href="/terms-of-use"'));
    assert.ok(!launch.html.includes(promotionsOrigin), 'The page must not expose the promotions service');

    const states = {
      'full-sample': ['Fully claimed', 'All spots are claimed. A spot reopens if an order in progress fails.', '0 of 25 spots left', '20 sent · 5 in progress'],
      'scheduled-sample': ['Scheduled', 'This promotion starts Feb 1, 2027, 00:00 UTC.', 'Starts Feb 1, 2027, 00:00 UTC Ends Feb 28, 2027, 23:59 UTC', '25 of 25 spots left'],
      'ended-sample': ['Ended', "This promotion has ended. New orders don't qualify.", 'final 9 of 25 sent 9 sent · 1 in progress'],
      'finished-sample': ['Finished', "This promotion has ended. New orders don't qualify.", 'final 10 of 25 sent 10 sent · 0 in progress'],
      'paused-sample': ['Paused', '20 of 25 spots left'],
      'delayed-sample': ['data delayed Showing the last known numbers from 14 minutes ago. They will update when the data source catches up.', 'Updated 14m ago'],
    };
    const browsable = new Set(['full-sample', 'delayed-sample']);
    for (const [id, copies] of Object.entries(states)) {
      const result = await page(`/promo/${id}`);
      assert.equal(result.canonical, `${origin}/promo/${id}`);
      const stateText = visibleText(result.html);
      for (const copy of copies) assert.ok(stateText.includes(copy), `/promo/${id} is missing: ${copy}`);
      assert.equal(stateText.includes('Browse services'), browsable.has(id), `/promo/${id} Browse services`);
      assert.equal(stateText.includes('data delayed'), id === 'delayed-sample', `/promo/${id} data delayed`);
      assert.equal(stateText.includes('Spot Status Qualifying order Cash back'), id !== 'scheduled-sample', `/promo/${id} table`);
    }

    // An unknown ID is the site's not-found page; an ID that is not a slug
    // never reaches the service; an unusable answer with nothing cached is 503.
    assert.match((await page('/promo/missing', 404)).title, /^Page not found/);
    assert.match((await page('/promo/Launch', 404)).title, /^Page not found/);
    assert.ok(!promotionRequests.some(url => /Launch/.test(url)), 'An invalid ID must not reach the promotions service');
    for (const id of ['broken', 'other-chain']) {
      assert.match((await page(`/promo/${id}`, 503)).title, /^Promotion temporarily unavailable/);
    }

    const json = await fetch(local + '/promo/launch.json');
    assert.equal(json.status, 200);
    assert.match(json.headers.get('content-type'), /^application\/json/);
    assert.equal(json.headers.get('cache-control'), 'public, max-age=30');
    const data = await json.json();
    assert.equal(data.version, 1);
    assert.equal(data.id, 'launch');
    assert.equal(data.chainId, chainId);
    assert.deepEqual(data.rows, vector.rows);
    assert.deepEqual(data.terms, vector.terms);
    for (const [path, status] of [['/promo/missing.json', 404], ['/promo/Launch.json', 404], ['/promo/broken.json', 503], ['/promo/other-chain.json', 503]]) {
      const response = await fetch(local + path);
      assert.equal(response.status, status, path);
      assert.equal(response.headers.get('cache-control'), 'no-store', path);
      assert.ok((await response.json()).error, path);
    }

    // The teaser and the llms.txt line advertise the open promotion on mainnet only.
    const llms = await (await fetch(local + '/llms.txt')).text();
    if (testnet) {
      assert.doesNotMatch(home.html, /href="\/promo\//);
      assert.doesNotMatch(llms, /\/promo\//);
    } else {
      assert.ok(home.html.includes('href="/promo/launch"'));
      const homeText = visibleText(home.html);
      assert.ok(homeText.includes('Launch promotion 100% back on your first order · up to 10 USDC · 20 of 25 spots left See promotion'), homeText.slice(0, 1200));
      assert.ok(homeText.indexOf('real services') < homeText.indexOf('See promotion'), 'The teaser sits under the hero');
      assert.ok(homeText.indexOf('See promotion') < homeText.indexOf('live services'), 'The teaser sits above the directory');
      assert.ok(llms.includes(`Current promotion: Launch promotion. 100% cash back in USDC on a buyer's first eligible order, up to 10 USDC, until Dec 31, 2026, 23:59 UTC. Eligible offers and terms: ${origin}/promo/launch\n`));
      assert.equal(llms.split('\n').filter(line => line.includes('/promo/')).length, 1);
    }
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
      const promotionUrls = urls.filter(url => new URL(url).pathname.startsWith('/promo'));
      assert.deepEqual(promotionUrls, promotions ? Object.keys(STATES).map(id => `${origin}/promo/${id}`) : []);
    }
  }
  console.log(`Built website metadata: ${scenario} — pages, social image, canonical URLs, indexing and status codes passed.`);
} finally {
  for (const server of [site, gateway, promotionsService]) {
    if (!server.listening) continue;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}

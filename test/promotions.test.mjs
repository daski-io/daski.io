import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { llmsText } from '../src/lib/chains.ts';
import { networkView, promotionsTarget, resolveNetworkConfig } from '../src/lib/network.ts';
import {
  browseServicesHref,
  delayedMinutes,
  delayedText,
  isAdvertisable,
  percentLabel,
  promotionBody,
  promotionDescription,
  promotionEnds,
  promotionLlmsLine,
  promotionPill,
  promotionStarts,
  promotionStateNote,
  promotionStats,
  promotionSubtitle,
  promotionTeaserParts,
  showsBrowseServices,
  spotStates,
  spotSummary,
  updatedLabel,
} from '../src/lib/promotionPresentation.ts';
import { advertisedPromotion } from '../src/lib/promotions.ts';
import {
  isPromotionId,
  parsePromotionSummaries,
  parsePromotionView,
  PromotionChainMismatchError,
  promotionPath,
} from '../src/lib/promotionView.ts';

const ROOT = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');
const vector = JSON.parse(readFileSync(new URL('./vectors/promotion-launch.json', import.meta.url), 'utf8'));
const launch = () => structuredClone(vector);
const MAINNET = 8453;
const REFRESHED = Date.parse(vector.refreshedAt);

function variant(changes) {
  const value = launch();
  changes(value);
  return value;
}

test('parses the launch promotion view and ignores unknown keys', () => {
  const view = parsePromotionView({ ...launch(), termsUrl: 'https://daski.io/promo/launch', budgetAtomic: '250000000' }, MAINNET);

  assert.equal(view.version, 1);
  assert.equal(view.id, 'launch');
  assert.equal(view.name, 'Launch promotion');
  assert.equal(view.status, 'active');
  assert.equal(view.percentBps, 10_000);
  assert.equal(view.capAtomic, '10000000');
  assert.deepEqual([view.spots, view.sent, view.inProgress, view.open], [25, 3, 2, 20]);
  assert.deepEqual(view.appliesTo.map((offer) => `${offer.serviceName}: ${offer.offerName}`), [
    'Agent Mailbox: Create mailbox',
    'Domain Management: Register domain',
  ]);
  assert.equal(view.walletRule, 'first_order');
  assert.equal(view.terms.length, 11);
  assert.equal(view.terms[0], vector.terms[0]);
  assert.equal(view.payoutWallet, vector.payoutWallet);
  assert.equal(view.chainId, MAINNET);
  assert.deepEqual(view.rows.map((row) => [row.spot, row.status]), [
    [1, 'sent'], [2, 'sent'], [3, 'sent'], [4, 'in_progress'], [5, 'in_progress'],
  ]);
  assert.equal(view.rows[2].orderTx, null);
  assert.equal('termsUrl' in view, false);
  assert.equal('budgetAtomic' in view, false);
  // The JSON route serves the parsed view, and the page re-parses it unchanged.
  assert.deepEqual(parsePromotionView(JSON.parse(JSON.stringify(view)), MAINNET), view);
});

test('normalizes hex to lowercase and accepts fractional UTC seconds', () => {
  const view = parsePromotionView(variant((value) => {
    value.payoutWallet = value.payoutWallet.toUpperCase().replace('0X', '0x');
    value.refreshedAt = '2026-10-21T12:00:30.123456Z';
  }), MAINNET);
  assert.equal(view.payoutWallet, vector.payoutWallet);
  assert.equal(view.refreshedAt, '2026-10-21T12:00:30.123456Z');
});

test('rejects a view reported for another chain', () => {
  assert.throws(() => parsePromotionView(launch(), 84532), PromotionChainMismatchError);
  assert.throws(
    () => parsePromotionView(launch(), 84532),
    /promotions service reports chain 8453, expected 84532/,
  );
  assert.throws(() => parsePromotionView(variant((value) => { value.chainId = '8453'; }), MAINNET), /chain ID is invalid/);
});

test('rejects malformed views', () => {
  const cases = {
    'not an object': () => [],
    'unsupported version': (value) => { value.version = 2; },
    'missing rows': (value) => { delete value.rows; },
    'uppercase ID': (value) => { value.id = 'Launch'; },
    'ID with a path': (value) => { value.id = 'launch/../admin'; },
    'empty name': (value) => { value.name = ' '; },
    'name with a newline': (value) => { value.name = 'Launch\npromotion'; },
    'unknown status': (value) => { value.status = 'paused'; },
    'string paused flag': (value) => { value.paused = 'false'; },
    'zero percentage': (value) => { value.percentBps = 0; },
    'over 100%': (value) => { value.percentBps = 10_001; },
    'fractional basis points': (value) => { value.percentBps = 12.5; },
    'zero cap': (value) => { value.capAtomic = '0'; },
    'decimal cap': (value) => { value.capAtomic = '10.5'; },
    'numeric cap': (value) => { value.capAtomic = 10_000_000; },
    'no spots': (value) => { value.spots = 0; value.sent = 0; value.inProgress = 0; value.open = 0; value.rows = []; },
    'counts that do not add up': (value) => { value.open = 21; },
    'rows missing a sent spot': (value) => { value.rows.splice(0, 1); },
    'rows out of order': (value) => { value.rows.reverse(); },
    'duplicate spot': (value) => { value.rows[1].spot = 1; },
    'spot beyond the total': (value) => { value.rows[4].spot = 26; },
    'cash back above the cap': (value) => { value.rows[0].cashbackAtomic = '10000001'; },
    'unknown row status': (value) => { value.rows[0].status = 'earned'; },
    'short transaction hash': (value) => { value.rows[0].orderTx = '0x1234'; },
    'start without a zone': (value) => { value.startsAt = '2026-10-21T00:00:00'; },
    'impossible date': (value) => { value.startsAt = '2026-02-30T00:00:00Z'; },
    'end before start': (value) => { value.endsAt = value.startsAt; },
    'no offers': (value) => { value.appliesTo = []; },
    'bad service ID': (value) => { value.appliesTo[0].serviceId = '0x01'; },
    'unknown wallet rule': (value) => { value.walletRule = 'first'; },
    'no terms': (value) => { value.terms = []; },
    'term with a control character': (value) => { value.terms[0] = 'Sent\u0007 automatically.'; },
    'empty terms version': (value) => { value.termsVersion = ''; },
    'bad payout wallet': (value) => { value.payoutWallet = '0x1234'; },
    'bad refresh time': (value) => { value.refreshedAt = 'yesterday'; },
  };
  for (const [name, change] of Object.entries(cases)) {
    const value = launch();
    const replaced = change(value);
    assert.throws(() => parsePromotionView(replaced ?? value, MAINNET), Error, name);
  }
  assert.throws(() => parsePromotionView(null, MAINNET), /not an object/);
});

test('parses the promotion index for the sitemap', () => {
  const summary = ({ id, name, status, paused, startsAt, endsAt }) => ({ id, name, status, paused, startsAt, endsAt });
  const promotions = parsePromotionSummaries({
    promotions: [summary(vector), { ...summary(vector), id: 'spring-2027', status: 'scheduled', extra: true }],
  });
  assert.deepEqual(promotions.map((promotion) => promotion.id), ['launch', 'spring-2027']);
  assert.equal('extra' in promotions[1], false);
  assert.deepEqual(parsePromotionSummaries({ promotions: [] }), []);
  assert.throws(() => parsePromotionSummaries({ promotions: [summary(vector), summary(vector)] }), /duplicate IDs/);
  assert.throws(() => parsePromotionSummaries({ promotions: [{ ...summary(vector), id: 'Bad ID' }] }), /ID is invalid/);
  assert.throws(() => parsePromotionSummaries({}), /index is invalid/);
});

test('promotion IDs are URL slugs', () => {
  for (const id of ['launch', 'spring-2027', 'a', `a${'b'.repeat(63)}`]) assert.equal(isPromotionId(id), true, id);
  for (const id of ['', 'Launch', 'launch-', '-launch', 'launch--x', 'launch.json', 'launch/x', `a${'b'.repeat(64)}`, 42, undefined]) {
    assert.equal(isPromotionId(id), false, String(id));
  }
  assert.equal(promotionPath({ id: 'launch' }), '/promo/launch');
});

test('presents the launch promotion in the approved copy', () => {
  const view = parsePromotionView(launch(), MAINNET);

  assert.equal(promotionSubtitle(view), 'Get USDC cash back on your first order');
  assert.equal(
    promotionBody(view),
    'Buy an eligible service on Daski. When the provider completes your first order, Daski sends 100% of the amount you paid back to the wallet that paid, up to 10 USDC.',
  );
  assert.equal(promotionStarts(view), 'Oct 21, 2026, 00:00 UTC');
  assert.equal(promotionEnds(view), 'Dec 31, 2026, 23:59 UTC');
  assert.deepEqual(promotionStats(view), [
    { label: 'cash back', value: '100% back', hint: 'of the order total' },
    { label: 'per wallet', value: 'Up to 10 USDC', hint: 'first completed order only' },
    { label: 'spots', value: '20 of 25 spots left', hint: '3 sent · 2 in progress' },
  ]);
  assert.deepEqual(promotionPill(view), { label: 'Active', tone: 'success', pulse: true });
  assert.equal(promotionStateNote(view), null);
  assert.equal(showsBrowseServices(view), true);
  assert.equal(browseServicesHref(view), '/#directory');
  assert.equal(
    browseServicesHref({ appliesTo: [view.appliesTo[0], { ...view.appliesTo[0], offerName: 'Other' }] }),
    `/service/${view.appliesTo[0].serviceId}`,
  );
  assert.deepEqual(spotStates(view).slice(0, 7), ['sent', 'sent', 'sent', 'in_progress', 'in_progress', 'open', 'open']);
  assert.equal(spotStates(view).length, 25);
  assert.equal(spotSummary(view), '3 sent, 2 in progress, 20 open, of 25 spots.');
  assert.deepEqual(promotionTeaserParts(view), ['100% back on your first order', 'up to 10 USDC', '20 of 25 spots left']);

  const description = promotionDescription(view);
  assert.equal(
    description,
    'Launch promotion: 100% cash back in USDC on your first eligible Daski order, up to 10 USDC. 25 spots, Oct 21, 2026 to Dec 31, 2026 UTC.',
  );
  assert.ok(description.length <= 160);
  assert.equal(
    promotionLlmsLine(view, 'https://daski.io'),
    "Current promotion: Launch promotion. 100% cash back in USDC on a buyer's first eligible order, up to 10 USDC, until Dec 31, 2026, 23:59 UTC. Eligible offers and terms: https://daski.io/promo/launch",
  );
});

test('spot states follow the held spot numbers, not the order of counts', () => {
  // Spot 2 was released; held spots keep their numbers.
  const view = parsePromotionView(variant((value) => {
    value.rows[1].spot = 3;
    value.rows[2].spot = 7;
    value.rows[3].spot = 9;
    value.rows[4].spot = 12;
  }), MAINNET);
  const states = spotStates(view);
  assert.deepEqual([1, 2, 3, 7, 9, 12].map((spot) => states[spot - 1]), ['sent', 'open', 'sent', 'sent', 'in_progress', 'in_progress']);
});

test('each state has its pill, note, stats and button', () => {
  const view = parsePromotionView(launch(), MAINNET);
  const as = (status, extra = {}) => ({ ...view, status, ...extra });

  assert.deepEqual(promotionPill(as('full')), { label: 'Fully claimed', tone: 'neutral', pulse: false });
  assert.equal(promotionStateNote(as('full')), 'All spots are claimed. A spot reopens if an order in progress fails.');
  assert.equal(showsBrowseServices(as('full')), true);

  assert.deepEqual(promotionPill(as('scheduled')), { label: 'Scheduled', tone: 'neutral', pulse: false });
  assert.equal(promotionStateNote(as('scheduled')), 'This promotion starts Oct 21, 2026, 00:00 UTC.');
  assert.equal(showsBrowseServices(as('scheduled')), false);

  for (const status of ['ended', 'finished']) {
    assert.equal(promotionPill(as(status)).tone, 'neutral');
    assert.equal(promotionStateNote(as(status)), "This promotion has ended. New orders don't qualify.");
    assert.equal(showsBrowseServices(as(status)), false);
    assert.deepEqual(promotionStats(as(status))[2], { label: 'final', value: '3 of 25 sent', hint: '3 sent · 2 in progress' });
  }
  assert.equal(promotionPill(as('ended')).label, 'Ended');
  assert.equal(promotionPill(as('finished')).label, 'Finished');

  const paused = as('active', { paused: true });
  assert.deepEqual(promotionPill(paused), { label: 'Paused', tone: 'warning', pulse: false });
  assert.equal(showsBrowseServices(paused), false);
});

test('other wallet rules drop the first-order wording', () => {
  const view = parsePromotionView(variant((value) => { value.walletRule = 'per_promotion'; }), MAINNET);
  assert.equal(promotionSubtitle(view), 'Get USDC cash back on an eligible order');
  assert.equal(
    promotionBody(view),
    'Buy an eligible service on Daski. When the provider completes your order, Daski sends 100% of the amount you paid back to the wallet that paid, up to 10 USDC.',
  );
  assert.deepEqual(promotionStats(view)[1], { label: 'maximum', value: 'Up to 10 USDC', hint: 'per wallet' });
  assert.equal(promotionTeaserParts(view)[0], '100% back on an eligible order');
  assert.doesNotMatch(promotionDescription(view) + promotionLlmsLine(view, 'https://daski.io'), /first/);
});

test('formats percentages, freshness and delays', () => {
  assert.equal(percentLabel(10_000), '100%');
  assert.equal(percentLabel(5_000), '50%');
  assert.equal(percentLabel(1_250), '12.5%');
  assert.equal(percentLabel(1), '0.01%');

  const view = parsePromotionView(launch(), MAINNET);
  assert.equal(updatedLabel(view, REFRESHED + 12_000), 'Updated 12s ago');
  assert.equal(delayedMinutes(view, REFRESHED + 5 * 60_000), null);
  assert.equal(delayedMinutes(view, REFRESHED + 14 * 60_000 + 30_000), 14);
  assert.equal(
    delayedText(14),
    'Showing the last known numbers from 14 minutes ago. They will update when the data source catches up.',
  );
  assert.match(delayedText(180), /from 3 hours ago\./);
  assert.match(delayedText(3 * 24 * 60), /from 3 days ago\./);
});

test('only an open, unpaused promotion is advertised', () => {
  assert.equal(isAdvertisable({ status: 'active', paused: false }), true);
  assert.equal(isAdvertisable({ status: 'full', paused: false }), true);
  assert.equal(isAdvertisable({ status: 'active', paused: true }), false);
  for (const status of ['scheduled', 'ended', 'finished']) assert.equal(isAdvertisable({ status, paused: false }), false);
});

test('llms.txt gains one line for the open promotion on a published network', () => {
  const mainnet = networkView(resolveNetworkConfig({ DASKI_NETWORK: 'mainnet', GATEWAY_URL: 'https://gateway.daski.io' }));
  const line = promotionLlmsLine(parsePromotionView(launch(), MAINNET), 'https://daski.io');
  const withLine = llmsText(mainnet, line);
  assert.equal(withLine.split('\n').filter((text) => text.includes('/promo/')).length, 1);
  assert.ok(withLine.includes(`\n${line}\n`));
  assert.equal(llmsText(mainnet), withLine.replace(`${line}\n\n`, ''));
  const unpublished = networkView(resolveNetworkConfig({ DASKI_NETWORK: 'mainnet' }));
  assert.doesNotMatch(llmsText(unpublished, line), /promo/);
});

test('the promotions service is a server-only origin, found on Railway by network, and a malformed override hides promotions', () => {
  const configured = resolveNetworkConfig({
    DASKI_NETWORK: 'mainnet',
    PROMOTIONS_INTERNAL_URL: 'http://promotions.railway.internal:8080/',
  });
  assert.equal(configured.promotionsInternalUrl, 'http://promotions.railway.internal:8080');
  assert.deepEqual(promotionsTarget(configured), { url: 'http://promotions.railway.internal:8080', chainId: MAINNET });
  assert.equal('promotionsInternalUrl' in networkView(configured), false);
  assert.equal(JSON.stringify(networkView(configured)).includes('promotions.railway.internal'), false);

  const unset = resolveNetworkConfig({ PROMOTIONS_INTERNAL_URL: '  ' });
  assert.equal(unset.promotionsInternalUrl, null);
  assert.equal(promotionsTarget(unset), null);

  // On Railway each network reads its own promotions service at its private address, unless overridden.
  const railway = { RAILWAY_PRIVATE_DOMAIN: 'daski-website.railway.internal' };
  assert.equal(resolveNetworkConfig(railway).promotionsInternalUrl, 'http://promotions.railway.internal:8080');
  assert.deepEqual(promotionsTarget(resolveNetworkConfig(railway)), { url: 'http://promotions.railway.internal:8080', chainId: 84532 });
  assert.equal(resolveNetworkConfig({ ...railway, DASKI_NETWORK: 'mainnet' }).promotionsInternalUrl, 'http://promotions-production.railway.internal:8080');
  assert.equal(resolveNetworkConfig({ ...railway, PROMOTIONS_INTERNAL_URL: 'http://promotions.test:8080' }).promotionsInternalUrl, 'http://promotions.test:8080');
  assert.equal(JSON.stringify(networkView(resolveNetworkConfig(railway))).includes('promotions.railway.internal'), false);

  const originalError = console.error;
  const reported = [];
  console.error = (...args) => reported.push(args.join(' '));
  try {
    for (const value of ['promotions.railway.internal:8080', 'http://promotions.railway.internal:8080/v1', 'ftp://promotions.internal']) {
      const config = resolveNetworkConfig({ DASKI_NETWORK: 'mainnet', PROMOTIONS_INTERNAL_URL: value });
      assert.equal(config.promotionsInternalUrl, null, value);
      assert.equal(config.id, 'mainnet');
    }
    // A malformed override hides promotions on Railway too; it never falls back to the default.
    assert.equal(resolveNetworkConfig({ ...railway, PROMOTIONS_INTERNAL_URL: 'ftp://promotions.internal' }).promotionsInternalUrl, null);
  } finally {
    console.error = originalError;
  }
  assert.equal(reported.length, 4);
  assert.match(reported[0], /PROMOTIONS_INTERNAL_URL/);
});

test('the teaser reads the current promotion only on a configured mainnet and hides on any error', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const calls = [];
  let reply = () => Response.json(launch());
  globalThis.fetch = async (url) => { calls.push(String(url)); return reply(); };
  console.error = () => {};
  const mainnet = resolveNetworkConfig({ DASKI_NETWORK: 'mainnet', PROMOTIONS_INTERNAL_URL: 'http://promotions.test:8080' });
  try {
    assert.equal(await advertisedPromotion(resolveNetworkConfig({ PROMOTIONS_INTERNAL_URL: 'http://promotions.test:8080' })), null);
    assert.equal(await advertisedPromotion(resolveNetworkConfig({ DASKI_NETWORK: 'mainnet' })), null);
    assert.equal(calls.length, 0);

    assert.equal((await advertisedPromotion(mainnet))?.id, 'launch');
    assert.deepEqual(calls, ['http://promotions.test:8080/v1/promotions/current']);

    reply = () => Response.json({ ...launch(), paused: true });
    assert.equal(await advertisedPromotion(mainnet), null);
    reply = () => Response.json({ ...launch(), status: 'scheduled' });
    assert.equal(await advertisedPromotion(mainnet), null);
    reply = () => Response.json({ ...launch(), chainId: 84532 });
    assert.equal(await advertisedPromotion(mainnet), null);
    reply = () => Response.json({ error: 'none open' }, { status: 404 });
    assert.equal(await advertisedPromotion(mainnet), null);
    reply = () => new Response('unavailable', { status: 503 });
    assert.equal(await advertisedPromotion(mainnet), null);
    reply = () => { throw new TypeError('fetch failed'); };
    assert.equal(await advertisedPromotion(mainnet), null);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test('promotion copy avoids refund, free and guaranteed wording', async () => {
  const sources = await Promise.all([
    'src/lib/promotionPresentation.ts',
    'src/lib/promotionView.ts',
    'src/lib/promotions.ts',
    'src/views/PromotionPage.tsx',
    'src/components/home/PromotionTeaser.tsx',
    'src/pages/promo/[id].astro',
    'src/pages/promo/[id].json.ts',
  ].map(read));
  const copy = [...sources, ...vector.terms].join('\n');
  assert.doesNotMatch(copy, /\b(refunds?|refunded|free|guaranteed?)\b/i);
  assert.doesNotMatch(copy, /Daski Marketplace/);
});

test('the browser never calls the promotions service', async () => {
  const islands = await Promise.all([
    'src/views/PromotionPage.tsx',
    'src/components/home/PromotionTeaser.tsx',
    'src/components/ui/Pill.tsx',
  ].map(read));
  for (const source of islands) {
    assert.doesNotMatch(source, /lib\/promotions(\.ts)?['"]|PROMOTIONS_INTERNAL_URL|promotionsInternalUrl/);
  }
  const page = await read('src/views/PromotionPage.tsx');
  assert.match(page, /`\$\{promotionPath\(initialView\)\}\.json`/);
});

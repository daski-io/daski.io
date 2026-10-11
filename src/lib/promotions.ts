// Server-only reads from the private promotions service.
//
// The service has no public address: it answers on Railway private
// networking at PROMOTIONS_INTERNAL_URL. Pages render its data on the server,
// and the promotion page's island refreshes from the site's own
// /promo/<id>.json route, so the browser never calls the service. Without the
// variable nothing here is called and promotions stay hidden.
//
// Payloads are parsed strictly (src/lib/promotionView.ts) and cached like the
// gateway's in src/lib/api.ts: pages render the last good payload at once and
// one background refresh per path starts once it is 30 seconds old.
import type { Snapshot } from './api.ts';
import { promotionsTarget, type NetworkConfig } from './network.ts';
import { isAdvertisable } from './promotionPresentation.ts';
import {
  parsePromotionSummaries,
  parsePromotionView,
  type PromotionSummary,
  type PromotionView,
} from './promotionView.ts';

export interface PromotionsTarget {
  /** The service's origin over private networking. */
  url: string;
  /** The chain this instance serves: a view for another chain is refused. */
  chainId: number;
}

export class PromotionsHttpError extends Error {
  status: number;

  constructor(status: number, path: string) {
    super(`promotions ${path} → ${status}`);
    this.status = status;
  }
}

const FETCH_TIMEOUT_MS = 5_000;
const CACHE_FRESH_MS = 30_000;

async function fetchJson(target: PromotionsTarget, path: string): Promise<unknown> {
  const response = await fetch(`${target.url}${path}`, {
    headers: { accept: 'application/json' },
    // The private service answers directly; a redirect is refused, not followed.
    redirect: 'error',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new PromotionsHttpError(response.status, path);
  }
  return response.json();
}

const isNotFound = (error: unknown) => error instanceof PromotionsHttpError && error.status === 404;

const cache = new Map<string, Snapshot<unknown>>();
const refreshing = new Map<string, Promise<Snapshot<unknown>>>();

function refresh<T>(key: string, load: () => Promise<T>): Promise<Snapshot<T>> {
  const pending = refreshing.get(key) as Promise<Snapshot<T>> | undefined;
  if (pending) return pending;
  const next = load()
    .then((value) => {
      const snapshot = { value, fetchedAt: Date.now() };
      cache.set(key, snapshot);
      return snapshot;
    })
    .finally(() => refreshing.delete(key));
  refreshing.set(key, next);
  return next;
}

// Only successful reads are cached, so unknown IDs never grow the cache. A
// promotion the service stops knowing (404) is dropped instead of served stale.
async function cachedSnapshot<T>(key: string, load: () => Promise<T>): Promise<Snapshot<T>> {
  if (!import.meta.env?.SSR) return { value: await load(), fetchedAt: Date.now() };
  const entry = cache.get(key) as Snapshot<T> | undefined;
  if (!entry) return refresh(key, load);
  if (Date.now() - entry.fetchedAt >= CACHE_FRESH_MS) {
    refresh(key, load).catch((error) => {
      if (isNotFound(error)) cache.delete(key);
      else console.error(`promotions refresh failed for ${key}`, error);
    });
  }
  return entry;
}

// Snapshots are keyed by origin so two configurations never share an entry.
const cacheKey = (target: PromotionsTarget, path: string) => `${target.url} ${path}`;

/** Every activated promotion, for the sitemap. */
export async function getPromotionSummaries(target: PromotionsTarget): Promise<PromotionSummary[]> {
  const path = '/v1/promotions';
  const { value } = await cachedSnapshot(cacheKey(target, path), async () =>
    parsePromotionSummaries(await fetchJson(target, path)));
  return value;
}

/** One promotion's view; rejects with a 404 PromotionsHttpError for an unknown or draft ID. */
export function getPromotionSnapshot(target: PromotionsTarget, id: string): Promise<Snapshot<PromotionView>> {
  const path = `/v1/promotions/${encodeURIComponent(id)}`;
  return cachedSnapshot(cacheKey(target, path), async () => {
    const view = parsePromotionView(await fetchJson(target, path), target.chainId);
    if (view.id !== id) throw new Error(`promotions ${path} answered for promotion ${view.id}`);
    return view;
  });
}

/** The promotion open to new orders, or null when there is none. */
export function getCurrentPromotionSnapshot(target: PromotionsTarget): Promise<Snapshot<PromotionView | null>> {
  const path = '/v1/promotions/current';
  return cachedSnapshot(cacheKey(target, path), async () => {
    try {
      return parsePromotionView(await fetchJson(target, path), target.chainId);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  });
}

/** How long the home page waits for the service before rendering without the teaser. */
const ADVERTISE_WAIT_MS = 1_500;
/** A copy older than this means the service has stopped answering, so nothing is advertised. */
const ADVERTISE_MAX_AGE_MS = 5 * 60_000;

/** The promise's value, or null once `ms` pass first. */
async function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  // A read that finishes after the deadline still fills the cache; its failure
  // is then ignored here rather than left unhandled.
  promise.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The promotion the home page teaser and llms.txt advertise, or null. Only a
 * mainnet instance advertises, and only an open promotion that is not paused,
 * from a copy read in the last five minutes. It waits briefly and never
 * throws, so a slow or failing service hides the teaser without delaying or
 * breaking the page.
 */
export async function advertisedPromotion(
  config: Pick<NetworkConfig, 'id' | 'promotionsInternalUrl' | 'chainId'>,
): Promise<PromotionView | null> {
  const target = promotionsTarget(config);
  if (config.id !== 'mainnet' || !target) return null;
  try {
    const snapshot = await within(getCurrentPromotionSnapshot(target), ADVERTISE_WAIT_MS);
    if (!snapshot?.value || Date.now() - snapshot.fetchedAt > ADVERTISE_MAX_AGE_MS) return null;
    return isAdvertisable(snapshot.value) ? snapshot.value : null;
  } catch (error) {
    console.error('Failed to load the current promotion', error);
    return null;
  }
}

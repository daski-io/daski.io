// Whether Daski is taking new quotes and purchases right now.
//
// The gateway can pause every new transaction for a few minutes, for a key
// switch or during an attack, while orders already paid keep running. It
// publishes that state at /public/v1/status. Every page shows a banner under
// the header while sales are paused, and the MCP refuses to quote or buy
// before calling the gateway, which refuses on its own too.
//
// A status read is used for at most 15 seconds. Within the gateway's max-age
// it is fresh; after that it is still served while one background read
// replaces it, and a failed read leaves it in place; past 15 seconds the
// caller waits for a new read. Without a status read in the last 15 seconds,
// sales count as open: the gateway still refuses while paused, and its status
// endpoint failing must never stop sales. A pause whose end has passed counts
// as open; the gateway ends it by itself then.
import type { NetworkConfig } from './network.ts';
import { utcDateTime } from './promotionPresentation.ts';

export type SalesPause = {
  salesOpen: false;
  /** Operator-written text from the gateway, or null. */
  reason: string | null;
  since: string | null;
  until: string | null;
};
export type SalesStatus = { salesOpen: true } | SalesPause;

export type SalesStatusTarget = Pick<NetworkConfig, 'gatewayUrl' | 'gatewayInternalUrl'>;
export type SalesStatusReader = (target: SalesStatusTarget) => Promise<SalesStatus>;

/** Wall-clock time for a pause's end; monotonic time for the age of a read, so a clock step cannot stretch it. */
export interface SalesStatusClock {
  now(): number;
  monotonic(): number;
}

export const SALES_STATUS_PATH = '/public/v1/status';
/** The longest a status read is used for. */
export const SALES_STATUS_MAX_AGE_MS = 15_000;
/** How long sales count as open after a failed read before it is tried again. */
const UNREADABLE_FRESH_MS = 5_000;
const FETCH_TIMEOUT_MS = 2_000;
/** How long a page waits for a status read before rendering without the banner. */
const PAGE_WAIT_MS = 500;
/** Retry-After for a pause without a known end. */
const UNKNOWN_END_RETRY_AFTER_SECONDS = 60;
const SALES_OPEN: SalesStatus = { salesOpen: true };
const systemClock: SalesStatusClock = { now: () => Date.now(), monotonic: () => performance.now() };

function timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 64) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function reasonText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  // Control, formatting (such as bidirectional overrides) and line separator characters are refused.
  return text && text.length <= 500 && !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(text) ? text : null;
}

/** A pause's fields, from the status endpoint or a gateway refusal; an unusable field is null. */
export function salesPause(fields: { reason?: unknown; since?: unknown; until?: unknown }): SalesPause {
  return { salesOpen: false, reason: reasonText(fields.reason), since: timestamp(fields.since), until: timestamp(fields.until) };
}

/**
 * The status endpoint's body. Only `salesOpen` must be valid: a pause the
 * gateway reports stays a pause even when its other fields are unusable.
 */
export function parseSalesStatus(value: unknown): SalesStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('gateway sales status is not an object');
  const body = value as Record<string, unknown>;
  if (body.salesOpen === true) return SALES_OPEN;
  if (body.salesOpen !== false) throw new Error('gateway sales status salesOpen is invalid');
  return salesPause(body);
}

/** The status as it stands at `now`: a pause past its end is over. */
export function effectiveSalesStatus(status: SalesStatus, now: number): SalesStatus {
  if (status.salesOpen || status.until === null) return status;
  return Date.parse(status.until) <= now ? SALES_OPEN : status;
}

/** Whole seconds until the pause ends, at least one; a minute when the end is unknown. */
export function pauseRetryAfterSeconds(until: string | null, now: number): number {
  if (until === null) return UNKNOWN_END_RETRY_AFTER_SECONDS;
  return Math.max(1, Math.ceil((Date.parse(until) - now) / 1000));
}

/** The gateway's max-age in milliseconds, within 0 to 15 seconds; 15 seconds without one. */
function freshFor(cacheControl: string | null): number {
  const seconds = /(?:^|,)\s*max-age=(\d+)\s*(?:,|$)/i.exec(cacheControl ?? '')?.[1];
  return seconds === undefined ? SALES_STATUS_MAX_AGE_MS : Math.min(Number(seconds) * 1000, SALES_STATUS_MAX_AGE_MS);
}

interface Reading {
  status: SalesStatus;
  /** Monotonic time of the read. */
  readAt: number;
  freshFor: number;
  unreadable: boolean;
}

/**
 * A reader with its own cache, keyed by gateway origin. The origin is the
 * one MCP tools call: GATEWAY_INTERNAL_URL when set, otherwise GATEWAY_URL.
 * It never throws.
 */
export function createSalesStatusReader(request: typeof fetch = fetch, clock: SalesStatusClock = systemClock): SalesStatusReader {
  const readings = new Map<string, Reading>();
  const pending = new Map<string, Promise<Reading>>();
  const failing = new Set<string>();

  async function read(origin: string): Promise<Reading> {
    try {
      const response = await request(`${origin}${SALES_STATUS_PATH}`, {
        headers: { accept: 'application/json' }, redirect: 'error', cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const json = /^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '');
      if (!response.ok || !json) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(response.ok ? 'gateway sales status is not JSON' : `gateway ${SALES_STATUS_PATH} → ${response.status}`);
      }
      const text = await response.text();
      if (text.length > 16_384) throw new Error('gateway sales status is too large');
      const status = parseSalesStatus(JSON.parse(text));
      failing.delete(origin);
      return { status, readAt: clock.monotonic(), freshFor: freshFor(response.headers.get('cache-control')), unreadable: false };
    } catch (error) {
      // Logged when reads start failing, not on every failed read.
      if (!failing.has(origin)) {
        failing.add(origin);
        console.error(`gateway sales status unreadable at ${origin} (${error instanceof Error ? error.message : String(error)}); ` +
          'sales count as open once no status was read in the last 15 seconds');
      }
      // The last read stays in use until it is 15 seconds old; the next attempt waits five seconds.
      const previous = readings.get(origin);
      const age = previous ? clock.monotonic() - previous.readAt : Infinity;
      if (previous && !previous.unreadable && age < SALES_STATUS_MAX_AGE_MS) {
        return { ...previous, freshFor: Math.min(SALES_STATUS_MAX_AGE_MS, age + UNREADABLE_FRESH_MS) };
      }
      return { status: SALES_OPEN, readAt: clock.monotonic(), freshFor: UNREADABLE_FRESH_MS, unreadable: true };
    }
  }

  function refresh(origin: string): Promise<Reading> {
    const running = pending.get(origin);
    if (running) return running;
    const next = read(origin)
      .then((reading) => { readings.set(origin, reading); return reading; })
      .finally(() => pending.delete(origin));
    pending.set(origin, next);
    return next;
  }

  return async (target) => {
    const origin = target.gatewayInternalUrl ?? target.gatewayUrl;
    if (!origin) return SALES_OPEN;
    let reading = readings.get(origin);
    const age = reading ? clock.monotonic() - reading.readAt : Infinity;
    if (!reading || age >= SALES_STATUS_MAX_AGE_MS) reading = await refresh(origin);
    else if (age >= reading.freshFor) void refresh(origin);
    return effectiveSalesStatus(reading.status, clock.now());
  };
}

/** The site's reader, shared by every page in this process. */
export const readSalesStatus: SalesStatusReader = createSalesStatusReader();

/**
 * The status for a page. A page waits at most half a second for a read, then
 * renders without the banner; the read still completes and fills the cache.
 */
export async function pageSalesStatus(target: SalesStatusTarget, read: SalesStatusReader = readSalesStatus,
  waitMs = PAGE_WAIT_MS): Promise<SalesStatus> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<SalesStatus>((resolve) => { timer = setTimeout(() => resolve(SALES_OPEN), waitMs); });
  try {
    return await Promise.race([read(target), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export interface SalesPauseNotice {
  /** One line: when new quotes and purchases resume, and that paid orders continue. */
  message: string;
}

/**
 * The banner's text while sales are paused, or null while they are open. The
 * end is shown in UTC, rounded up to the minute, so a buyer never retries
 * early. The banner stays one line, so the gateway's reason is left to the
 * MCP's SALES_PAUSED answer.
 */
export function salesPauseNotice(status: SalesStatus): SalesPauseNotice | null {
  if (status.salesOpen) return null;
  const end = status.until === null ? null : utcDateTime(Math.ceil(Date.parse(status.until) / 60_000) * 60_000);
  return {
    message: end
      ? `Sales are paused until ${end}. New quotes and purchases resume then. Orders already paid continue normally.`
      : 'Sales are paused. New quotes and purchases resume shortly. Orders already paid continue normally.',
  };
}

// Whether Daski is taking new quotes and purchases right now.
//
// The gateway can pause every new transaction for a few minutes, for a key
// switch or during an attack, while orders already paid keep running. It
// publishes that state at /public/v1/status. Pages that lead to buying show a
// banner while sales are paused, and the MCP refuses to quote or buy before
// calling the gateway, which refuses on its own too.
//
// A status is used for at most 15 seconds. Within the gateway's max-age it is
// fresh; after that it is still served while one background read replaces
// it; past 15 seconds the caller waits for a new read. A status that cannot
// be read counts as open: the gateway still refuses while paused, and its
// status endpoint failing must never stop sales. A pause whose end has passed
// counts as open; the gateway ends it by itself then.
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

export const SALES_STATUS_PATH = '/public/v1/status';
/** The longest a status read is used for. */
export const SALES_STATUS_MAX_AGE_MS = 15_000;
/** How long an unreadable status counts as open before it is read again. */
const UNREADABLE_FRESH_MS = 5_000;
const FETCH_TIMEOUT_MS = 2_000;
/** Retry-After for a pause without a known end. */
const UNKNOWN_END_RETRY_AFTER_SECONDS = 60;
const SALES_OPEN: SalesStatus = { salesOpen: true };

function timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 64) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function reasonText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= 500 && !/[\u0000-\u001f\u007f]/.test(text) ? text : null;
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
  readAt: number;
  freshFor: number;
  unreadable: boolean;
}

/**
 * A reader with its own cache, keyed by gateway origin. The origin is the
 * one MCP tools call: GATEWAY_INTERNAL_URL when set, otherwise GATEWAY_URL.
 * It never throws.
 */
export function createSalesStatusReader(request: typeof fetch = fetch, now: () => number = Date.now): SalesStatusReader {
  const readings = new Map<string, Reading>();
  const pending = new Map<string, Promise<Reading>>();

  async function read(origin: string, previous: Reading | undefined): Promise<Reading> {
    try {
      const response = await request(`${origin}${SALES_STATUS_PATH}`, {
        headers: { accept: 'application/json' }, redirect: 'error', cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(`gateway ${SALES_STATUS_PATH} → ${response.status}`);
      }
      if (!/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw new Error('gateway sales status is not JSON');
      const text = await response.text();
      if (text.length > 16_384) throw new Error('gateway sales status is too large');
      const status = parseSalesStatus(JSON.parse(text));
      return { status, readAt: now(), freshFor: freshFor(response.headers.get('cache-control')), unreadable: false };
    } catch (error) {
      // Logged when the status becomes unreadable, not on every read while it stays so.
      if (!previous?.unreadable) {
        console.error(`gateway sales status unreadable at ${origin}; treating sales as open: ${error instanceof Error ? error.message : String(error)}`);
      }
      return { status: SALES_OPEN, readAt: now(), freshFor: UNREADABLE_FRESH_MS, unreadable: true };
    }
  }

  function refresh(origin: string): Promise<Reading> {
    const running = pending.get(origin);
    if (running) return running;
    const next = read(origin, readings.get(origin))
      .then((reading) => { readings.set(origin, reading); return reading; })
      .finally(() => pending.delete(origin));
    pending.set(origin, next);
    return next;
  }

  return async (target) => {
    const origin = target.gatewayInternalUrl ?? target.gatewayUrl;
    if (!origin) return SALES_OPEN;
    let reading = readings.get(origin);
    const age = reading ? now() - reading.readAt : Infinity;
    if (!reading || age >= SALES_STATUS_MAX_AGE_MS) reading = await refresh(origin);
    else if (age >= reading.freshFor) void refresh(origin);
    return effectiveSalesStatus(reading.status, now());
  };
}

/** The site's reader, shared by every page in this process. */
export const readSalesStatus: SalesStatusReader = createSalesStatusReader();

export interface SalesPauseNotice {
  headline: string;
  detail: string;
  reason: string | null;
}

/**
 * The banner's text while sales are paused, or null while they are open. The
 * end is shown in UTC, rounded up to the minute, so a buyer never retries
 * early.
 */
export function salesPauseNotice(status: SalesStatus): SalesPauseNotice | null {
  if (status.salesOpen) return null;
  const end = status.until === null ? null : utcDateTime(Math.ceil(Date.parse(status.until) / 60_000) * 60_000);
  return {
    headline: end ? `Sales are paused until ${end}.` : 'Sales are paused.',
    detail: `New quotes and purchases ${end ? 'resume then' : 'resume shortly'}. Orders already paid continue normally.`,
    reason: status.reason,
  };
}

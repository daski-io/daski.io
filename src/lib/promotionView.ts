// A cash back promotion as the private promotions service describes it.
//
// Browser-safe: the promotion page's island re-parses its same-origin JSON
// refresh with these functions. Only src/lib/promotions.ts talks to the
// promotions service itself. Parsing is strict: a malformed field rejects the
// whole payload, unknown keys are ignored, and a view for another chain is
// refused.

export type PromotionStatus = 'scheduled' | 'active' | 'full' | 'ended' | 'finished';
export type PromotionWalletRule = 'first_order' | 'per_promotion' | 'never_cashback';
export type PromotionRowStatus = 'in_progress' | 'sent';

/** One activated promotion in the service's index (GET /v1/promotions). */
export interface PromotionSummary {
  id: string;
  name: string;
  status: PromotionStatus;
  paused: boolean;
  /** ISO 8601 UTC; inclusive. */
  startsAt: string;
  /** ISO 8601 UTC; exclusive. */
  endsAt: string;
}

export interface PromotionOffer {
  serviceId: string;
  serviceName: string;
  offerName: string;
}

/** A spot currently held by an order. */
export interface PromotionRow {
  spot: number;
  status: PromotionRowStatus;
  /** The qualifying order's transaction, or null when it is not published. */
  orderTx: string | null;
  /** The cash back transaction, or null until it is sent (or when it is not published). */
  cashbackTx: string | null;
  /** USDC in its smallest unit. */
  cashbackAtomic: string;
}

/** The full view of one promotion (GET /v1/promotions/{id} and /v1/promotions/current). */
export interface PromotionView extends PromotionSummary {
  version: 1;
  /** 10000 = 100%. */
  percentBps: number;
  /** Per-order cap in USDC's smallest unit. */
  capAtomic: string;
  spots: number;
  sent: number;
  inProgress: number;
  /** spots − sent − inProgress. */
  open: number;
  appliesTo: PromotionOffer[];
  /** The promotion covers every offer listed on its chain. A service that does not send it reads as false. */
  appliesToAll: boolean;
  walletRule: PromotionWalletRule;
  /** The promotion's approved terms, rendered verbatim and in order. */
  terms: string[];
  termsVersion: string;
  /** The address cash back is sent from, when published. */
  payoutWallet: string | null;
  chainId: number;
  /** The service's last successful chain sync. */
  refreshedAt: string;
  /** Held spots only, ascending by spot. */
  rows: PromotionRow[];
}

const STATUSES: readonly PromotionStatus[] = ['scheduled', 'active', 'full', 'ended', 'finished'];
const WALLET_RULES: readonly PromotionWalletRule[] = ['first_order', 'per_promotion', 'never_cashback'];
const ROW_STATUSES: readonly PromotionRowStatus[] = ['in_progress', 'sent'];

const PROMOTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROMOTION_ID_MAX_LENGTH = 64;
/** The page draws one tile per spot, so a sane upper bound keeps it renderable. */
export const PROMOTION_SPOTS_MAX = 1_000;
const UTC_TIMESTAMP = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d{1,9})?Z$/;

/** A promotion ID doubles as its URL slug: lowercase words joined by single hyphens. */
export function isPromotionId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= PROMOTION_ID_MAX_LENGTH && PROMOTION_ID.test(value);
}

export function promotionPath(promotion: Pick<PromotionSummary, 'id'>): string {
  return `/promo/${promotion.id}`;
}

export class PromotionChainMismatchError extends Error {
  constructor(reported: number, expected: number) {
    super(`promotions service reports chain ${reported}, expected ${expected}`);
    this.name = 'PromotionChainMismatchError';
  }
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`promotion ${label} is not an object`);
  }
  return value as JsonRecord;
}

function text(value: unknown, label: string, maximum: number): string {
  if (
    typeof value !== 'string' || value.trim().length === 0 || value.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) throw new Error(`promotion ${label} is invalid`);
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new Error(`promotion ${label} is invalid`);
  }
  return value as T;
}

function flag(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`promotion ${label} is invalid`);
  return value;
}

function integer(value: unknown, label: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error(`promotion ${label} is invalid`);
  }
  return Number(value);
}

function atomic(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,29})$/.test(value)) {
    throw new Error(`promotion ${label} is invalid`);
  }
  return value;
}

function hex(value: unknown, label: string, bytes: number): string {
  if (typeof value !== 'string' || !new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`).test(value)) {
    throw new Error(`promotion ${label} is invalid`);
  }
  return value.toLowerCase();
}

function nullableHex(value: unknown, label: string, bytes: number): string | null {
  return value === null ? null : hex(value, label, bytes);
}

// UTC only: a timestamp without a zone would be read in the server's or the
// browser's local time. The calendar round trip rejects dates such as Feb 30.
function utcTimestamp(value: unknown, label: string): string {
  const match = typeof value === 'string' ? UTC_TIMESTAMP.exec(value) : null;
  const time = match ? Date.parse(value as string) : Number.NaN;
  if (!match || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 19) !== match[1]) {
    throw new Error(`promotion ${label} is invalid`);
  }
  return value as string;
}

function list(value: unknown, label: string, minimum: number, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`promotion ${label} is invalid`);
  }
  return value;
}

function parseSummaryFields(item: JsonRecord): PromotionSummary {
  if (!isPromotionId(item.id)) throw new Error('promotion ID is invalid');
  const startsAt = utcTimestamp(item.startsAt, 'start');
  const endsAt = utcTimestamp(item.endsAt, 'end');
  if (Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('promotion ends before it starts');
  return {
    id: item.id,
    name: text(item.name, 'name', 160),
    status: oneOf(item.status, STATUSES, 'status'),
    paused: flag(item.paused, 'paused flag'),
    startsAt,
    endsAt,
  };
}

function parseOffer(value: unknown, index: number): PromotionOffer {
  const offer = record(value, `offer ${index}`);
  return {
    serviceId: hex(offer.serviceId, `offer ${index} service ID`, 32),
    serviceName: text(offer.serviceName, `offer ${index} service name`, 160),
    offerName: text(offer.offerName, `offer ${index} name`, 160),
  };
}

function parseRow(value: unknown, index: number, spots: number, capAtomic: string): PromotionRow {
  const row = record(value, `row ${index}`);
  const cashbackAtomic = atomic(row.cashbackAtomic, `row ${index} cash back amount`);
  if (BigInt(cashbackAtomic) > BigInt(capAtomic)) {
    throw new Error(`promotion row ${index} cash back exceeds the cap`);
  }
  return {
    spot: integer(row.spot, `row ${index} spot`, 1, spots),
    status: oneOf(row.status, ROW_STATUSES, `row ${index} status`),
    orderTx: nullableHex(row.orderTx, `row ${index} order transaction`, 32),
    cashbackTx: nullableHex(row.cashbackTx, `row ${index} cash back transaction`, 32),
    cashbackAtomic,
  };
}

/** Parses a promotion view, refusing one for another chain than `expectedChainId`. */
export function parsePromotionView(value: unknown, expectedChainId: number): PromotionView {
  const item = record(value, 'view');
  if (item.version !== 1) throw new Error('promotion view version is unsupported');
  const chainId = integer(item.chainId, 'chain ID', 1, Number.MAX_SAFE_INTEGER);
  if (chainId !== expectedChainId) throw new PromotionChainMismatchError(chainId, expectedChainId);

  const summary = parseSummaryFields(item);
  const capAtomic = atomic(item.capAtomic, 'cap');
  if (capAtomic === '0') throw new Error('promotion cap is invalid');
  const spots = integer(item.spots, 'spots', 1, PROMOTION_SPOTS_MAX);
  const sent = integer(item.sent, 'sent count', 0, spots);
  const inProgress = integer(item.inProgress, 'in-progress count', 0, spots);
  const open = integer(item.open, 'open count', 0, spots);
  if (sent + inProgress + open !== spots) throw new Error('promotion spot counts do not add up');

  const rows = list(item.rows, 'rows', 0, spots).map((row, index) => parseRow(row, index, spots, capAtomic));
  rows.forEach((row, index) => {
    if (index > 0 && row.spot <= rows[index - 1].spot) throw new Error('promotion rows are not in spot order');
  });
  // The table lists exactly the spots the counters report.
  if (
    rows.filter((row) => row.status === 'sent').length !== sent ||
    rows.filter((row) => row.status === 'in_progress').length !== inProgress
  ) throw new Error('promotion rows do not match the spot counts');

  return {
    version: 1,
    ...summary,
    percentBps: integer(item.percentBps, 'percentage', 1, 10_000),
    capAtomic,
    spots,
    sent,
    inProgress,
    open,
    appliesTo: list(item.appliesTo, 'offers', 1, 100).map(parseOffer),
    appliesToAll: item.appliesToAll === undefined ? false : flag(item.appliesToAll, 'applies-to-all flag'),
    walletRule: oneOf(item.walletRule, WALLET_RULES, 'wallet rule'),
    terms: list(item.terms, 'terms', 1, 50).map((term, index) => text(term, `term ${index}`, 2_000)),
    termsVersion: text(item.termsVersion, 'terms version', 64),
    payoutWallet: nullableHex(item.payoutWallet, 'payout wallet', 20),
    chainId,
    refreshedAt: utcTimestamp(item.refreshedAt, 'refresh time'),
    rows,
  };
}

/** Parses the service's index of activated promotions. */
export function parsePromotionSummaries(value: unknown): PromotionSummary[] {
  const index = record(value, 'index');
  const promotions = list(index.promotions, 'index', 0, 1_000)
    .map((item, position) => parseSummaryFields(record(item, `index entry ${position}`)));
  if (new Set(promotions.map((promotion) => promotion.id)).size !== promotions.length) {
    throw new Error('promotion index contains duplicate IDs');
  }
  return promotions;
}

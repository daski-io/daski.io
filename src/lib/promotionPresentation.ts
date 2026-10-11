// Copy and formatting for cash back promotions, shared by the promotion page,
// the home page teaser, the page metadata and llms.txt. Browser-safe and
// deterministic: dates are formatted in UTC by hand, so server-rendered text
// and the island's first render always match.
import { atomicUsdc } from './displayFormat.ts';
import { relativeTime } from './marketplacePresentation.ts';
import { promotionPath, type PromotionStatus, type PromotionView } from './promotionView.ts';

/** Numbers older than this show the data delayed banner. */
export const PROMOTION_DELAYED_AFTER_MS = 5 * 60_000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (value: number) => String(value).padStart(2, '0');

/** "Dec 31, 2026" */
export function utcDate(time: number): string {
  const date = new Date(time);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** "Dec 31, 2026, 23:59 UTC" */
export function utcDateTime(time: number): string {
  const date = new Date(time);
  return `${utcDate(time)}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

export function promotionStarts(view: Pick<PromotionView, 'startsAt'>): string {
  return utcDateTime(Date.parse(view.startsAt));
}

/** The end is exclusive, so the last minute that still counts is shown: 2027-01-01T00:00Z reads "Dec 31, 2026, 23:59 UTC". */
export function promotionEnds(view: Pick<PromotionView, 'endsAt'>): string {
  return utcDateTime(Date.parse(view.endsAt) - 1);
}

/** 10000 basis points read "100%", 1250 read "12.5%". */
export function percentLabel(bps: number): string {
  const whole = Math.floor(bps / 100);
  const fraction = String(bps % 100).padStart(2, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}%` : `${whole}%`;
}

export function capLabel(view: Pick<PromotionView, 'capAtomic'>): string {
  return `${atomicUsdc(view.capAtomic)} USDC`;
}

export function isClosedStatus(status: PromotionStatus): boolean {
  return status === 'ended' || status === 'finished';
}

/** Active or Fully claimed: the promotion takes new orders. */
export function isOpenStatus(status: PromotionStatus): boolean {
  return status === 'active' || status === 'full';
}

const isFirstOrder = (view: Pick<PromotionView, 'walletRule'>) => view.walletRule === 'first_order';

export function promotionSubtitle(view: Pick<PromotionView, 'walletRule'>): string {
  return isFirstOrder(view)
    ? 'Get USDC cash back on your first order'
    : 'Get USDC cash back on an eligible order';
}

export function promotionBody(view: Pick<PromotionView, 'walletRule' | 'percentBps' | 'capAtomic'>): string {
  const order = isFirstOrder(view) ? 'your first order' : 'your order';
  return `Buy an eligible service on Daski. When the provider completes ${order}, Daski sends `
    + `${percentLabel(view.percentBps)} of the amount you paid back to the wallet that paid, up to ${capLabel(view)}.`;
}

export type PillTone = 'success' | 'neutral' | 'warning';

export interface PromotionPill {
  label: string;
  tone: PillTone;
  pulse: boolean;
}

/** Paused shows over any status; Fully claimed is neutral, not a warning. */
export function promotionPill(view: Pick<PromotionView, 'status' | 'paused'>): PromotionPill {
  if (view.paused) return { label: 'Paused', tone: 'warning', pulse: false };
  switch (view.status) {
    case 'active': return { label: 'Active', tone: 'success', pulse: true };
    case 'full': return { label: 'Fully claimed', tone: 'neutral', pulse: false };
    case 'scheduled': return { label: 'Scheduled', tone: 'neutral', pulse: false };
    case 'ended': return { label: 'Ended', tone: 'neutral', pulse: false };
    case 'finished': return { label: 'Finished', tone: 'neutral', pulse: false };
  }
}

export interface PromotionStat {
  label: string;
  value: string;
  hint: string;
}

export function promotionStats(view: PromotionView): PromotionStat[] {
  const counts = `${view.sent} sent · ${view.inProgress} in progress`;
  return [
    { label: 'cash back', value: `${percentLabel(view.percentBps)} back`, hint: 'of the order total' },
    isFirstOrder(view)
      ? { label: 'per wallet', value: `Up to ${capLabel(view)}`, hint: 'first completed order only' }
      : { label: 'maximum', value: `Up to ${capLabel(view)}`, hint: 'per wallet' },
    isClosedStatus(view.status)
      ? { label: 'final', value: `${view.sent} of ${view.spots} sent`, hint: counts }
      : { label: 'spots', value: `${view.open} of ${view.spots} spots left`, hint: counts },
  ];
}

/** The line beside the spots heading for states that need one. */
export function promotionStateNote(view: Pick<PromotionView, 'status' | 'startsAt'>): string | null {
  switch (view.status) {
    case 'scheduled': return `This promotion starts ${promotionStarts(view)}.`;
    case 'full': return 'All spots are claimed. A spot reopens if an order in progress fails.';
    case 'ended':
    case 'finished': return "This promotion has ended. New orders don't qualify.";
    default: return null;
  }
}

/** "Browse services" shows only while the promotion takes new orders and is not paused. */
export function showsBrowseServices(view: Pick<PromotionView, 'status' | 'paused'>): boolean {
  return isOpenStatus(view.status) && !view.paused;
}

/** One eligible service links to its page; several link to the services directory. */
export function browseServicesHref(view: Pick<PromotionView, 'appliesTo'>): string {
  const serviceIds = [...new Set(view.appliesTo.map((offer) => offer.serviceId))];
  return serviceIds.length === 1 ? `/service/${serviceIds[0]}` : '/#directory';
}

export type SpotState = 'sent' | 'in_progress' | 'open';

/** Every spot's state, by spot number: a spot no row holds is open. */
export function spotStates(view: Pick<PromotionView, 'spots' | 'rows'>): SpotState[] {
  const held = new Map(view.rows.map((row) => [row.spot, row.status]));
  return Array.from({ length: view.spots }, (_, index) => held.get(index + 1) ?? 'open');
}

export function spotSummary(view: Pick<PromotionView, 'spots' | 'sent' | 'inProgress' | 'open'>): string {
  return `${view.sent} sent, ${view.inProgress} in progress, ${view.open} open, of ${view.spots} spots.`;
}

export function spotNumber(spot: number, spots: number): string {
  return String(spot).padStart(Math.max(2, String(spots).length), '0');
}

/** "0x1234abcd…ef5678" */
export function shortHex(value: string, head = 8, tail = 6): string {
  return value.length > head + tail ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}

export function updatedLabel(view: Pick<PromotionView, 'refreshedAt'>, now: number): string {
  return `Updated ${relativeTime(view.refreshedAt, now)}`;
}

/** Whole minutes since the service's last chain sync, or null while that is recent. */
export function delayedMinutes(view: Pick<PromotionView, 'refreshedAt'>, now: number): number | null {
  const age = now - Date.parse(view.refreshedAt);
  return age > PROMOTION_DELAYED_AFTER_MS ? Math.floor(age / 60_000) : null;
}

export function delayedText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const ago = minutes < 120 ? `${minutes} minutes ago` : hours < 48 ? `${hours} hours ago` : `${Math.floor(hours / 24)} days ago`;
  return `Showing the last known numbers from ${ago}. They will update when the data source catches up.`;
}

/** Unique page description; the layout trims anything over 160 characters. */
export function promotionDescription(view: PromotionView): string {
  const order = isFirstOrder(view) ? 'your first eligible Daski order' : 'an eligible Daski order';
  return `${view.name}: ${percentLabel(view.percentBps)} cash back in USDC on ${order}, up to ${capLabel(view)}. `
    + `${view.spots} spots, ${utcDate(Date.parse(view.startsAt))} to ${utcDate(Date.parse(view.endsAt) - 1)} UTC.`;
}

/** The home page teaser's middle parts, between the name and "See promotion". */
export function promotionTeaserParts(view: PromotionView): string[] {
  return [
    `${percentLabel(view.percentBps)} back on ${isFirstOrder(view) ? 'your first order' : 'an eligible order'}`,
    `up to ${capLabel(view)}`,
    view.status === 'full' ? 'all spots claimed' : `${view.open} of ${view.spots} spots left`,
  ];
}

/**
 * Whether the home page and llms.txt may advertise this promotion: it takes
 * new orders (Active or Fully claimed) and is not paused. The status is the
 * service's, derived from its own clock.
 */
export function isAdvertisable(view: Pick<PromotionView, 'status' | 'paused'>): boolean {
  return isOpenStatus(view.status) && !view.paused;
}

/** The single llms.txt line for the open promotion. */
export function promotionLlmsLine(view: PromotionView, siteUrl: string): string {
  const order = isFirstOrder(view) ? "a buyer's first eligible order" : 'an eligible order';
  return `Current promotion: ${view.name}. ${percentLabel(view.percentBps)} cash back in USDC on ${order}, `
    + `up to ${capLabel(view)}, until ${promotionEnds(view)}. Eligible offers and terms: ${siteUrl}${promotionPath(view)}`;
}

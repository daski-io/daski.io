import type { SalesPauseNotice } from '../lib/salesStatus';
import { NoticeStrip, type NoticeTone } from './ui/NoticeStrip';

/** Danger red at the testnet strip's strengths: a lighter red for the kicker and dot. */
const PAUSED_TONE: NoticeTone = { fg: '#ef5a6b', bg: 'rgba(217,69,96,0.12)', bd: 'rgba(217,69,96,0.45)' };

/**
 * The first strip under the header on every page while the gateway has paused
 * sales, above the network strip. The server renders it from the gateway's
 * status. The dk-sales-pause class marks it for the legal pages' sticky
 * offsets (legal.css) and the runtime checks.
 */
export function SalesPauseBanner({ notice }: { notice: SalesPauseNotice }) {
  return <NoticeStrip className="dk-sales-pause" tone={PAUSED_TONE} kicker="Sales paused" message={notice.message} live />;
}

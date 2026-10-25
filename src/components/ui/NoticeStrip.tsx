/** A strip's accent (kicker and dot), background tint and top line. */
export interface NoticeTone {
  fg: string;
  bg: string;
  bd: string;
}

interface NoticeStripProps {
  tone: NoticeTone;
  kicker: string;
  message: string;
  /** The dot pulses. The pulse is a CSS class, so it stops for visitors who prefer reduced motion. */
  live: boolean;
  className?: string;
}

/**
 * One line under the header naming a site-wide state: a thin line in the
 * tone's color on top, a dot and an uppercase kicker, then the message in
 * plain text. Every strip under the header uses it, so stacked strips match.
 */
export function NoticeStrip({ tone, kicker, message, live, className }: NoticeStripProps) {
  return (
    <div role="status" className={className} style={{ background: tone.bg, borderTop: `1px solid ${tone.bd}` }}>
      <div
        className="dk-section-pad-mobile"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 32px',
          minHeight: 34,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--pro-text)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            color: tone.fg,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          <span
            aria-hidden="true"
            className={live ? 'dk-pulse-dot' : undefined}
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}
          />
          {kicker}
        </span>
        <span style={{ flex: 1, minWidth: 200, padding: '7px 0' }}>{message}</span>
      </div>
    </div>
  );
}

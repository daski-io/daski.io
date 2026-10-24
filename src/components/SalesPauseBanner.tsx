import type { SalesPauseNotice } from '../lib/salesStatus';

/**
 * Under the header on pages that lead to buying, while the gateway has paused
 * sales. Static HTML: the server renders it from the gateway's status.
 */
export function SalesPauseBanner({ notice }: { notice: SalesPauseNotice }) {
  return (
    <div role="status" className="dk-sales-pause" style={{ background: 'var(--danger-tint)', borderBottom: '1px solid var(--danger)' }}>
      <div
        className="dk-section-pad-mobile"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '12px 32px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px 12px',
          flexWrap: 'wrap',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--pro-text)',
        }}
      >
        <span style={kickerStyle}>Sales paused</span>
        <strong style={{ fontWeight: 600 }}>{notice.headline}</strong>
        <span>{notice.detail}</span>
        {notice.reason && <span style={{ color: 'var(--pro-text-dim)' }}>Reason: {notice.reason}</span>}
      </div>
    </div>
  );
}

const kickerStyle = {
  color: 'var(--danger)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontWeight: 600,
} as const;

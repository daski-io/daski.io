import type { ReactNode } from 'react';

interface PillProps {
  children?: ReactNode;
  pulse?: boolean;
}

/**
 * Success-tinted pill used to mark services as live and providers as
 * verified — the only two states currently surfaced on the site.
 */
export function Pill({ children, pulse = false }: PillProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 22,
        padding: '0 10px',
        borderRadius: 999,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontWeight: 500,
        background: 'rgba(28,186,153,0.14)',
        color: '#5dd6ad',
        border: '1px solid rgba(28,186,153,0.4)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          animation: pulse ? 'dk-pulse 1.6s ease-in-out infinite' : undefined,
        }}
      />
      {children}
    </span>
  );
}

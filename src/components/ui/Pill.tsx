import type { ReactNode } from 'react';

export type PillTone = 'success' | 'neutral' | 'warning';

interface PillProps {
  children?: ReactNode;
  tone?: PillTone;
  pulse?: boolean;
}

const TONES: Record<PillTone, { background: string; color: string; border: string }> = {
  success: { background: 'rgba(28,186,153,0.14)', color: '#5dd6ad', border: '1px solid rgba(28,186,153,0.4)' },
  neutral: { background: 'var(--pro-surface2)', color: 'var(--pro-text-dim)', border: '1px solid var(--pro-border)' },
  warning: { background: 'rgba(212,150,31,0.14)', color: '#e7b34a', border: '1px solid rgba(212,150,31,0.4)' },
};

/**
 * Status pill with a leading dot, success-tinted by default. The pulse is a
 * CSS class, so it stops for visitors who prefer reduced motion.
 */
export function Pill({ children, tone = 'success', pulse = false }: PillProps) {
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
        ...TONES[tone],
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        className={pulse ? 'dk-pulse-dot' : undefined}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
        }}
      />
      {children}
    </span>
  );
}

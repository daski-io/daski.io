import type { ReactNode } from 'react';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'mono';

interface PillProps {
  tone?: Tone;
  children?: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const TONES: Record<Tone, { bg: string; fg: string; bd: string }> = {
  success: { bg: 'rgba(28,186,153,0.14)', fg: '#5dd6ad', bd: 'rgba(28,186,153,0.4)' },
  warning: { bg: 'rgba(212,150,31,0.14)', fg: '#e7b34a', bd: 'rgba(212,150,31,0.4)' },
  danger:  { bg: 'rgba(217,69,96,0.14)',  fg: '#ef5a6b', bd: 'rgba(217,69,96,0.4)' },
  info:    { bg: 'rgba(59,130,212,0.14)', fg: '#6aa9ee', bd: 'rgba(59,130,212,0.4)' },
  neutral: { bg: 'var(--pro-surface2)',   fg: 'var(--pro-text-dim)', bd: 'var(--pro-border)' },
  mono:    { bg: '#06070b',               fg: 'var(--mint-400)', bd: 'var(--pro-border)' },
};

export function Pill({ tone = 'neutral', children, dot = true, pulse = false, size = 'md' }: PillProps) {
  const t = TONES[tone];
  const h = size === 'sm' ? 18 : 22;
  const fs = size === 'sm' ? 10 : 11;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: h,
        padding: '0 10px',
        borderRadius: 999,
        fontFamily: 'var(--font-mono)',
        fontSize: fs,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontWeight: 500,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            animation: pulse ? 'dk-pulse 1.6s ease-in-out infinite' : undefined,
          }}
        />
      )}
      {children}
    </span>
  );
}

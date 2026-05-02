import type { CSSProperties, ReactNode } from 'react';

interface MonoProps {
  children?: ReactNode;
  dim?: boolean;
  mint?: boolean;
  style?: CSSProperties;
}

export function Mono({ children, dim, mint, style }: MonoProps) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: mint ? 'var(--mint-400)' : dim ? 'var(--pro-text-dim)' : 'var(--pro-text)',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

interface CaptionProps {
  children?: ReactNode;
  style?: CSSProperties;
}

export function Caption({ children, style }: CaptionProps) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--pro-text-dim)',
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

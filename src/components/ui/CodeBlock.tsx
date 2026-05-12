import type { CSSProperties, ReactNode } from 'react';
import { CopyButton } from './CopyButton';

interface CodeBlockProps {
  children?: ReactNode;
  title?: ReactNode;
  copy?: string;
  copyLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

export function CodeBlock({ children, title, copy, copyLabel = 'Copy', size = 'md', style }: CodeBlockProps) {
  const fs = size === 'sm' ? 12 : size === 'lg' ? 14 : 13;
  return (
    <div
      style={{
        background: '#06070b',
        border: '1px solid var(--pro-border)',
        borderRadius: 12,
        overflow: 'hidden',
        ...(style ?? {}),
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderBottom: '1px solid var(--pro-border)',
            background: 'linear-gradient(#0c0d13, #08090f)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--pro-text-dim)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: '18px 22px',
          background: 'transparent',
          fontFamily: 'var(--font-mono)',
          fontSize: fs,
          color: '#cfcfdb',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </pre>
      {copy && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px 14px',
            borderTop: '1px solid var(--pro-border)',
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          <CopyButton text={copy} label={copyLabel} size="sm" />
        </div>
      )}
    </div>
  );
}

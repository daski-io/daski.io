import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

interface AddrProps {
  children?: ReactNode;
  link?: string;
  short?: boolean;
  copyable?: boolean;
  style?: CSSProperties;
}

export function Addr({ children, link = '#', short = true, copyable = true, style }: AddrProps) {
  const text = (children ?? '').toString();
  const display =
    short && text.startsWith('0x') && text.length > 14
      ? `${text.slice(0, 6)}…${text.slice(-4)}`
      : text;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--pro-text)',
        ...(style ?? {}),
      }}
    >
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        style={{ color: 'var(--pro-text)', borderBottom: '1px dashed var(--pro-border-hi)' }}
      >
        {display}
      </a>
      {copyable && (
        <button
          onClick={() => {
            try {
              navigator.clipboard.writeText(text);
            } catch {
              // ignore
            }
          }}
          title="Copy"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--pro-text-dim)',
            cursor: 'pointer',
            padding: 2,
            display: 'inline-flex',
          }}
        >
          <Icon name="copy" size={12} />
        </button>
      )}
    </span>
  );
}

import { useState } from 'react';
import { Icon } from './Icon';

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: 'sm' | 'md';
}

const SIZES = {
  sm: { height: 30, padding: '0 12px', fontSize: 12, radius: 7 },
  md: { height: 38, padding: '0 16px', fontSize: 13, radius: 8 },
} as const;

/**
 * Mono-styled "copy to clipboard" button. We render the bespoke button
 * directly rather than via a generic `<Button>` wrapper because this is
 * the only button shape the marketing site actually uses — the rest of
 * the UI is inline-styled.
 */
export function CopyButton({ text, label = 'Copy', size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const sz = SIZES[size];
  const onClick = () => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore; clipboard write may fail on insecure contexts
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="dk-btn"
      style={{
        height: sz.height,
        padding: sz.padding,
        fontSize: sz.fontSize,
        borderRadius: sz.radius,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        background: '#06070b',
        color: 'var(--mint-400)',
        border: '1px solid var(--pro-border)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        letterSpacing: '-0.005em',
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? 'Copied' : label}
    </button>
  );
}

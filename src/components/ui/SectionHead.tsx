import type { ReactNode } from 'react';
import { Caption } from './Mono';

interface SectionHeadProps {
  kicker?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function SectionHead({ kicker, title, subtitle, action }: SectionHeadProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        paddingBottom: 20,
        borderBottom: '1px solid var(--pro-border)',
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0 }}>
        {kicker && <Caption style={{ marginBottom: 8 }}>{kicker}</Caption>}
        {title && (
          <h2
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: 'var(--pro-text)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p
            style={{
              color: 'var(--pro-text-dim)',
              fontSize: 14,
              margin: '8px 0 0',
              maxWidth: 640,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

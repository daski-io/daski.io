import type { CSSProperties, ReactNode } from 'react';

interface SectionProps {
  children?: ReactNode;
  pad?: string;
  maxWidth?: number;
  style?: CSSProperties;
  id?: string;
}

export function Section({ children, pad = '64px 32px 0', maxWidth = 1280, style, id }: SectionProps) {
  return (
    <section
      id={id}
      style={{
        maxWidth,
        margin: '0 auto',
        padding: pad,
        ...(style ?? {}),
      }}
    >
      {children}
    </section>
  );
}

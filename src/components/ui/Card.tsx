import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children?: ReactNode;
  padding?: number | string;
  style?: CSSProperties;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, padding = 20, style, hoverable = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={'dk-card' + (hoverable ? ' hoverable' : '')}
      style={{
        padding,
        cursor: onClick ? 'pointer' : 'default',
        ...(style ?? {}),
      }}
    >
      {children}
    </div>
  );
}

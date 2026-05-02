import type { CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'mono' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  iconRight?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
  title?: string;
  full?: boolean;
}

const SIZES: Record<Size, { height: number; padding: string; fontSize: number; radius: number }> = {
  sm: { height: 30, padding: '0 12px', fontSize: 13, radius: 7 },
  md: { height: 38, padding: '0 16px', fontSize: 14, radius: 8 },
  lg: { height: 46, padding: '0 22px', fontSize: 15, radius: 10 },
};

const VARIANTS: Record<Variant, CSSProperties & { fontFamily?: string; fontSize?: number; fontWeight?: number }> = {
  primary: { background: 'var(--mint-500)', color: '#04221b', border: '1px solid transparent', fontWeight: 600 },
  secondary: { background: 'transparent', color: 'var(--pro-text)', border: '1px solid var(--pro-border-hi)' },
  ghost: { background: 'transparent', color: 'var(--pro-text)', border: '1px solid transparent' },
  mono: {
    background: '#06070b',
    color: 'var(--mint-400)',
    border: '1px solid var(--pro-border)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  },
  outline: { background: 'transparent', color: 'var(--mint-400)', border: '1px solid var(--mint-700)' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  icon,
  iconRight,
  type = 'button',
  style,
  title,
  full,
}: ButtonProps) {
  const sz = SIZES[size];
  const vr = VARIANTS[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className="dk-btn"
      style={{
        ...vr,
        height: sz.height,
        padding: sz.padding,
        fontSize: vr.fontSize ?? sz.fontSize,
        borderRadius: sz.radius,
        fontFamily: vr.fontFamily ?? 'var(--font-sans)',
        fontWeight: vr.fontWeight ?? 500,
        cursor: 'pointer',
        display: full ? 'flex' : 'inline-flex',
        width: full ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        letterSpacing: '-0.005em',
        ...(style ?? {}),
      }}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

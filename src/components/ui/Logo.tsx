interface LogoProps {
  size?: number;
}

export function Logo({ size = 22 }: LogoProps) {
  return (
    <span
      className="dk-logo"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 0,
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        fontSize: size,
        letterSpacing: '-0.02em',
        color: '#fff',
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      <span>daski</span>
      <span style={{ color: 'var(--mint-400)', marginLeft: '0.04em' }}>_</span>
    </span>
  );
}

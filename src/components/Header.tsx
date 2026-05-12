import { Link, NavLink, useLocation } from 'react-router-dom';
import { Logo } from './ui/Logo';
import { Icon } from './ui/Icon';

interface NavItem {
  to: string;
  label: string;
  match?: (path: string) => boolean;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Services', match: (p) => p === '/' || p.startsWith('/service') || p.startsWith('/providers') },
  { to: '/agents', label: 'For Agents' },
  { to: '/activity', label: 'Activity' },
];

function NetworkBadge() {
  return (
    <a
      href="https://sepolia.basescan.org/"
      target="_blank"
      rel="noreferrer"
      title="Open Basescan"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--pro-text-dim)',
        letterSpacing: '0.04em',
        borderBottom: 'none',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--mint-400)',
          animation: 'dk-pulse 1.6s ease-in-out infinite',
        }}
      />
      <span>base sepolia</span>
      <Icon name="external" size={11} color="var(--pro-text-dim)" />
    </a>
  );
}

export function Header() {
  const location = useLocation();
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        borderBottom: '1px solid var(--pro-border)',
        background: 'rgba(10,10,15,0.86)',
        backdropFilter: 'blur(12px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.1)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 32px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link to="/" style={{ borderBottom: 'none' }}>
            <Logo size={20} />
          </Link>
          <nav style={{ display: 'flex', gap: 2 }}>
            {ITEMS.map((it) => {
              const active = it.match ? it.match(location.pathname) : location.pathname === it.to;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '0 12px',
                    height: 32,
                    borderRadius: 6,
                    color: active ? 'var(--pro-text)' : 'var(--pro-text-dim)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: '-0.005em',
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {it.label}
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 12,
                        right: 12,
                        bottom: -19,
                        height: 1,
                        background: 'var(--mint-400)',
                      }}
                    />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <a
            href="https://github.com/daski-io"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--pro-text-dim)',
              borderBottom: 'none',
              fontSize: 13,
            }}
            className="hide-mobile"
          >
            <Icon name="github" size={15} />
            <span>GitHub</span>
          </a>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--pro-text-dim)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: '1px solid var(--pro-border)',
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            sandbox
          </span>
          <NetworkBadge />
        </div>
      </div>
    </header>
  );
}

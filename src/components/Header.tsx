import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Logo } from './ui/Logo';
import { Icon } from './ui/Icon';

interface NavItem {
  to: string;
  label: string;
  match?: (path: string) => boolean;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Services', match: (p) => p === '/' || p.startsWith('/service') },
  { to: '/agents', label: 'For Agents' },
  { to: '/providers', label: 'For Providers' },
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

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
        className="dk-section-pad-mobile"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 32px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link to="/" style={{ borderBottom: 'none' }}>
            <Logo size={20} />
          </Link>
          <nav className="dk-desktop-only" style={{ display: 'flex', gap: 2 }}>
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
                        bottom: -14,
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

        {/* Desktop utility cluster (GitHub).
            On mobile this collapses behind the hamburger and the link
            reappears inside the slide-down panel. */}
        <div className="dk-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
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
          >
            <Icon name="github" size={15} />
            <span>GitHub</span>
          </a>
        </div>

        {/* Always-visible: SANDBOX + Base Sepolia */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
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

        {/* Mobile hamburger toggle */}
        <button
          className="dk-mobile-only"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 8,
            cursor: 'pointer',
            background: 'transparent',
            border: '1px solid var(--pro-border)',
            color: 'var(--pro-text)',
          }}
        >
          <Icon name={open ? 'close' : 'menu'} size={18} />
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div
          className="dk-mobile-only"
          style={{
            display: 'none',
            flexDirection: 'column',
            borderTop: '1px solid var(--pro-border)',
            background: 'rgba(10,10,15,0.97)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '14px 20px 20px',
            gap: 4,
            animation: 'dk-fadein 180ms cubic-bezier(0.2,0,0,1) both',
          }}
        >
          {ITEMS.map((it) => {
            const active = it.match ? it.match(location.pathname) : location.pathname === it.to;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                style={{
                  background: active ? 'var(--pro-surface)' : 'transparent',
                  border: '1px solid ' + (active ? 'var(--pro-border-hi)' : 'transparent'),
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 8,
                  color: active ? 'var(--pro-text)' : 'var(--pro-text-dim)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 15,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  borderBottom: '1px solid ' + (active ? 'var(--pro-border-hi)' : 'transparent'),
                }}
              >
                <span>{it.label}</span>
                {active && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--mint-400)',
                    }}
                  />
                )}
              </NavLink>
            );
          })}

          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--pro-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <a
              href="https://github.com/daski-io"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--pro-text-dim)',
                borderBottom: 'none',
                fontSize: 14,
                padding: '4px 2px',
              }}
            >
              <Icon name="github" size={16} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

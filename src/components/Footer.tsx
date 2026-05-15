import { Logo } from './ui/Logo';

interface FooterLink {
  label: string;
  href?: string;
  to?: string;
  external?: boolean;
}

interface FooterColProps {
  title: string;
  links: FooterLink[];
}

function FooterCol({ title, links }: FooterColProps) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--pro-text)',
          marginBottom: 14,
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <a
                href={l.to}
                style={{
                  color: 'var(--pro-text-dim)',
                  fontSize: 13,
                  borderBottom: 'none',
                  fontFamily: 'var(--font-sans)',
                  textDecoration: 'none',
                }}
              >
                {l.label}
              </a>
            ) : (
              <a
                href={l.href}
                target={l.external ? '_blank' : undefined}
                rel={l.external ? 'noreferrer' : undefined}
                style={{ color: 'var(--pro-text-dim)', fontSize: 13, borderBottom: 'none' }}
              >
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--pro-border)',
        marginTop: 96,
        background: 'var(--pro-bg)',
      }}
    >
      <div
        className="dk-footer-grid"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '48px 32px 28px',
        }}
      >
        <div>
          <Logo size={20} />
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--pro-text-dim)',
              margin: '14px 0 0',
              maxWidth: 320,
              lineHeight: 1.55,
            }}
          >
            Marketplace infrastructure for the agent economy. Live on Base Sepolia Testnet.
          </p>
        </div>
        <FooterCol
          title="Protocol"
          links={[
            { label: 'GitHub', href: 'https://github.com/daski-io', external: true },
            { label: 'Whitepaper', href: '/MarketplaceProtocolWhitePaper.pdf', external: true },
          ]}
        />
        <FooterCol
          title="Resources"
          links={[
            { label: 'For Agents', to: '/agents' },
            { label: 'For Providers', to: '/providers' },
            { label: 'Activity', to: '/activity' },
          ]}
        />
        <FooterCol
          title="Connect"
          links={[{ label: 'X / Twitter', href: 'https://x.com/pmmmm', external: true }]}
        />
      </div>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '20px 32px 32px',
          borderTop: '1px solid var(--pro-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--pro-text-dim)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexWrap: 'wrap',
        }}
      >
        <span>daski protocol · sandbox · base sepolia · 84532</span>
      </div>
    </footer>
  );
}

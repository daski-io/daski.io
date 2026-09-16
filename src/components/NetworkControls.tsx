import { networkStrip, networkSwitchLinks, type NetworkId, type NetworkView } from '../lib/chains';

const NET_TONE: Record<NetworkId, { fg: string; bg: string; bd: string }> = {
  testnet: { fg: '#e7b34a', bg: 'rgba(212,150,31,0.12)', bd: 'rgba(212,150,31,0.45)' },
  mainnet: { fg: 'var(--mint-400)', bg: 'rgba(52,211,177,0.10)', bd: 'rgba(52,211,177,0.45)' },
};

interface NetworkSwitchProps {
  network: NetworkView;
  pathname: string;
  size?: 'sm' | 'md';
}

/* Testnet / Mainnet segmented selector: plain links between the two sites. */
export function NetworkSwitch({ network, pathname, size = 'sm' }: NetworkSwitchProps) {
  const height = size === 'sm' ? 28 : 38;
  return (
    <nav
      aria-label="Network"
      style={{
        display: 'inline-flex',
        padding: 2,
        borderRadius: 8,
        gap: 2,
        background: 'var(--pro-surface)',
        border: '1px solid var(--pro-border)',
      }}
    >
      {networkSwitchLinks(network, pathname).map((link) => {
        const tone = NET_TONE[link.id];
        return (
          <a
            key={link.id}
            href={link.href}
            aria-current={link.active ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              height: height - 6,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid ' + (link.active ? tone.bd : 'transparent'),
              background: link.active ? tone.bg : 'transparent',
              color: link.active ? tone.fg : 'var(--pro-text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: size === 'sm' ? 10 : 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 500,
              textDecoration: 'none',
              borderBottom: '1px solid ' + (link.active ? tone.bd : 'transparent'),
              transition: 'all 160ms var(--ease)',
              flex: size === 'sm' ? 'none' : 1,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'currentColor',
                opacity: link.active ? 1 : 0.35,
              }}
            />
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}

/* Persistent strip under the nav: names the network on every page. */
export function NetworkStrip({ network }: { network: NetworkView }) {
  const strip = networkStrip(network);
  if (!strip) return null;
  const tone = NET_TONE[strip.tone];
  return (
    <div role="status" style={{ background: tone.bg, borderTop: `1px solid ${tone.bd}` }}>
      <div
        className="dk-section-pad-mobile"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 32px',
          minHeight: 34,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--pro-text)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            color: tone.fg,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'currentColor',
              animation: strip.live ? 'dk-pulse 1.6s ease-in-out infinite' : undefined,
            }}
          />
          {strip.kicker}
        </span>
        <span style={{ flex: 1, minWidth: 200, padding: '7px 0' }}>{strip.message}</span>
      </div>
    </div>
  );
}

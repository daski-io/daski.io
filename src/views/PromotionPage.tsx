import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Caption, Mono } from '../components/ui/Mono';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { Section } from '../components/ui/Section';
import { explorerAddress, explorerTx, type NetworkView } from '../lib/chains';
import {
  appliesToEntries,
  browseServicesHref,
  delayedMinutes,
  delayedText,
  promotionBody,
  promotionEnds,
  promotionPill,
  promotionStarts,
  promotionStateNote,
  promotionStats,
  promotionSubtitle,
  shortHex,
  showsBrowseServices,
  spotNumber,
  spotStates,
  spotSummary,
  updatedLabel,
  type SpotState,
} from '../lib/promotionPresentation';
import { parsePromotionView, promotionPath, type PromotionView } from '../lib/promotionView';

const REFRESH_MS = 30_000;

export function PromotionPage({
  network,
  initialView,
  initialFetchedAt,
  renderedAt,
}: {
  network: NetworkView;
  initialView: PromotionView;
  /** When the server's copy was read from the promotions service. */
  initialFetchedAt: number;
  /** The server's clock at render time, so hydration repeats the server's text exactly. */
  renderedAt: number;
}) {
  const [view, setView] = useState(initialView);
  const [now, setNow] = useState(renderedAt);
  const reportedRefreshError = useRef(false);

  useEffect(() => {
    // The browser refreshes from this site's own JSON route, never from the
    // promotions service.
    const source = `${promotionPath(initialView)}.json`;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(source, { cache: 'no-store', headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`${source} → ${response.status}`);
        const next = parsePromotionView(await response.json(), network.chainId);
        if (!cancelled && next.id === initialView.id) {
          setView(next);
          reportedRefreshError.current = false;
        }
      } catch (error) {
        // The last numbers stay on screen; the data delayed banner appears
        // once they are more than five minutes old.
        if (!cancelled && !reportedRefreshError.current) {
          console.error('Failed to refresh the promotion', error);
          reportedRefreshError.current = true;
        }
      }
    };
    setNow(Date.now());
    if (Date.now() - initialFetchedAt >= REFRESH_MS) void load();
    const refreshTimer = window.setInterval(() => void load(), REFRESH_MS);
    const tickTimer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.clearInterval(tickTimer);
    };
  }, [initialView, initialFetchedAt, network.chainId]);

  const delayed = delayedMinutes(view, now);
  const testnet = network.id === 'testnet';

  return (
    <div>
      <Section pad="88px 32px 40px">
        <div style={{ maxWidth: 820 }}>
          <Caption style={{ marginBottom: 18 }}>
            promotions · cash back{testnet && ` · ${network.label.toLowerCase()}`}
          </Caption>
          <h1 className="dk-page-h1" style={headingStyle}>{view.name}</h1>
          <p style={subtitleStyle}>{promotionSubtitle(view)}</p>
        </div>
      </Section>

      <Section pad="0 32px 56px">
        {testnet && (
          <Notice kicker={network.label.toLowerCase()}>
            Real cash back applies only to Mainnet orders on{' '}
            <a href={network.siteUrls.mainnet} style={{ color: 'var(--mint-400)' }}>
              {new URL(network.siteUrls.mainnet).host}
            </a>.
          </Notice>
        )}
        {delayed !== null && <Notice kicker="data delayed">{delayedText(delayed)}</Notice>}
        <HeaderCard view={view} now={now} delayed={delayed !== null} />
        <Stats view={view} />
        <Spots view={view} explorerUrl={network.explorerUrl} />
      </Section>

      <Section pad="0 32px 56px">
        <SectionTitle kicker="how it works" title="Three steps, no claim form." />
        <Steps view={view} chainName={network.chainName} />
      </Section>

      <Section pad="0 32px 16px">
        <SectionTitle kicker="terms" title="Terms" />
        <Terms terms={view.terms} />
      </Section>
    </div>
  );
}

function Notice({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div role="status" style={noticeStyle}>
      <span style={noticeKickerStyle}>{kicker}</span>
      <span>{children}</span>
    </div>
  );
}

function HeaderCard({ view, now, delayed }: { view: PromotionView; now: number; delayed: boolean }) {
  const pill = promotionPill(view);
  const meta: [string, ReactNode][] = [
    ['Starts', promotionStarts(view)],
    ['Ends', promotionEnds(view)],
    ['Applies to', <Offers view={view} />],
  ];
  return (
    <div className="dk-card" style={{ padding: '28px 28px 26px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <Pill tone={pill.tone} pulse={pill.pulse && !delayed}>{pill.label}</Pill>
        <Mono dim style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon name="refresh" size={12} />{updatedLabel(view, now)}
        </Mono>
      </div>
      <p style={bodyStyle}>{promotionBody(view)}</p>
      <dl className="dk-promo-meta" style={{ margin: '22px 0 0' }}>
        {meta.map(([label, value]) => (
          <div key={label} style={{ minWidth: 0 }}>
            <dt><Caption style={{ marginBottom: 6 }}>{label}</Caption></dt>
            <dd style={metaValueStyle}>{value}</dd>
          </div>
        ))}
      </dl>
      {showsBrowseServices(view) && (
        <div style={{ marginTop: 24 }}>
          <a href={browseServicesHref(view)} className="dk-btn" style={buttonStyle}>
            Browse services <Icon name="arrow" size={14} />
          </a>
        </div>
      )}
    </div>
  );
}

function Offers({ view }: { view: PromotionView }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {appliesToEntries(view).map((entry) => (
        <li key={`${entry.href} ${entry.label}`}>
          <a href={entry.href} style={offerLinkStyle}>{entry.label}</a>
          {entry.service && <span style={{ color: 'var(--pro-text-dim)', fontWeight: 400 }}> · {entry.service}</span>}
        </li>
      ))}
    </ul>
  );
}

function Stats({ view }: { view: PromotionView }) {
  return (
    <div className="dk-card dk-promo-stats" style={{ padding: 0 }}>
      {promotionStats(view).map((stat) => (
        <div key={stat.label} className="dk-promo-stat">
          <Caption style={{ marginBottom: 10 }}>{stat.label}</Caption>
          <div style={statValueStyle}>{stat.value}</div>
          <div style={{ color: 'var(--pro-text-dim)', fontSize: 13, marginTop: 8 }}>{stat.hint}</div>
        </div>
      ))}
    </div>
  );
}

const TILES: Record<SpotState, { label: string; style: CSSProperties; icon: ReactNode }> = {
  sent: {
    label: 'Sent',
    style: { background: 'var(--mint-400)', border: '1px solid var(--mint-400)', color: '#06110e' },
    icon: <Icon name="check" size={16} />,
  },
  in_progress: {
    label: 'In progress',
    style: {
      background: 'repeating-linear-gradient(135deg, rgba(52,211,177,0.32) 0 3px, transparent 3px 8px)',
      border: '1px solid rgba(52,211,177,0.6)',
      color: 'var(--mint-400)',
    },
    icon: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>···</span>,
  },
  open: {
    label: 'Open',
    style: { background: 'transparent', border: '1px dashed var(--pro-border-hi)', color: 'var(--pro-text-dim)' },
    icon: null,
  },
};

function Spots({ view, explorerUrl }: { view: PromotionView; explorerUrl: string }) {
  const note = promotionStateNote(view);
  const columns = {
    '--dk-promo-cols': String(Math.min(view.spots, 10)),
    '--dk-promo-cols-sm': String(Math.min(view.spots, 5)),
  } as CSSProperties;
  return (
    <div className="dk-card" style={{ marginTop: 16, padding: '24px 24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Caption>spots</Caption>
        {note && <span style={{ color: 'var(--pro-text-dim)', fontSize: 13 }}>{note}</span>}
      </div>
      <div role="img" aria-label={spotSummary(view)} className="dk-promo-strip" style={columns}>
        {spotStates(view).map((state, index) => (
          <div key={index} aria-hidden="true" style={{ ...TILES[state].style, ...tileStyle }}>
            {TILES[state].icon}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', opacity: state === 'sent' ? 0.75 : 0.8 }}>
              {spotNumber(index + 1, view.spots)}
            </span>
          </div>
        ))}
      </div>
      <div aria-hidden="true" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 14 }}>
        {(['sent', 'in_progress', 'open'] as const).map((state) => (
          <span key={state} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--pro-text-dim)', fontSize: 13 }}>
            <span style={{ ...TILES[state].style, width: 16, height: 16, borderRadius: 4, display: 'inline-block' }} />
            {TILES[state].label}
          </span>
        ))}
      </div>
      {view.rows.length > 0 && <SpotTable view={view} explorerUrl={explorerUrl} />}
      {view.payoutWallet && (
        <p style={{ color: 'var(--pro-text-dim)', fontSize: 13, margin: '16px 0 0' }}>
          All cash back is sent from{' '}
          <a
            href={explorerAddress(explorerUrl, view.payoutWallet)}
            target="_blank"
            rel="noreferrer"
            title={view.payoutWallet}
            className="dk-link-mint"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
          >
            {shortHex(view.payoutWallet, 6, 4)}<Icon name="external" size={11} />
          </a>
        </p>
      )}
    </div>
  );
}

function SpotTable({ view, explorerUrl }: { view: PromotionView; explorerUrl: string }) {
  return (
    <div role="region" aria-label="Spots held" tabIndex={0} style={tableFrameStyle}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead>
          <tr>
            {['Spot', 'Status', 'Qualifying order', 'Cash back'].map((heading) => (
              <th key={heading} scope="col" style={tableHeadStyle}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <tr key={row.spot}>
              <td style={{ ...cellStyle, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--pro-text-dim)' }}>
                {spotNumber(row.spot, view.spots)}
              </td>
              <td style={{ ...cellStyle, fontSize: 14, color: 'var(--pro-text)' }}>
                {row.status === 'sent' ? 'Sent' : 'In progress'}
              </td>
              <td style={cellStyle}>
                {row.orderTx ? <TxLink hash={row.orderTx} explorerUrl={explorerUrl} /> : <Dim>—</Dim>}
              </td>
              <td style={cellStyle}>
                {row.status !== 'sent'
                  ? <Dim>Pending</Dim>
                  : row.cashbackTx ? <TxLink hash={row.cashbackTx} explorerUrl={explorerUrl} /> : <Dim>—</Dim>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TxLink({ hash, explorerUrl }: { hash: string; explorerUrl: string }) {
  return (
    <a
      href={explorerTx(explorerUrl, hash)}
      target="_blank"
      rel="noreferrer"
      title={hash}
      className="dk-link-mint"
      style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
    >
      {shortHex(hash)}<Icon name="external" size={11} />
    </a>
  );
}

function Dim({ children }: { children: string }) {
  return <span style={{ color: 'var(--pro-text-dim)', fontSize: 13 }}>{children}</span>;
}

function Steps({ view, chainName }: { view: PromotionView; chainName: string }) {
  const steps = [
    {
      title: 'Buy an eligible service',
      text: view.walletRule === 'first_order'
        ? 'Place your first order on Daski with one of the eligible offers.'
        : 'Place an order on Daski with one of the eligible offers.',
    },
    { title: 'Provider completes the order', text: 'Your spot is held while the order is in progress.' },
    { title: 'USDC arrives in the paying wallet', text: `Cash back is sent on ${chainName}, usually within 60 minutes.` },
  ];
  return (
    <ol className="dk-promo-steps">
      {steps.map((step, index) => (
        <li key={step.title} className="dk-card" style={{ padding: '22px 22px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Mono mint style={{ fontSize: 12 }}>{spotNumber(index + 1, steps.length)}</Mono>
          <div style={{ color: 'var(--pro-text)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{step.title}</div>
          <div style={{ color: 'var(--pro-text-dim)', fontSize: 14, lineHeight: 1.55 }}>{step.text}</div>
        </li>
      ))}
    </ol>
  );
}

// The promotion's approved terms, verbatim and in order.
function Terms({ terms }: { terms: string[] }) {
  return (
    <div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {terms.map((term, index) => (
          <li key={index} style={termRowStyle}>
            <Mono dim style={{ fontSize: 12, paddingTop: 3 }}>{spotNumber(index + 1, terms.length)}</Mono>
            <span style={{ textWrap: 'pretty' } as CSSProperties}>{term}</span>
          </li>
        ))}
      </ol>
      <p style={{ ...termRowStyle, margin: 0 }}>
        <span />
        <span>
          These terms apply in addition to the{' '}
          <a href="/terms-of-use" style={{ color: 'var(--mint-400)' }}>Daski Terms of Use</a>.
        </span>
      </p>
    </div>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <Caption style={{ marginBottom: 10 }}>{kicker}</Caption>
      <h2 style={{ color: 'var(--pro-text)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
    </div>
  );
}

const headingStyle = { fontSize: 56, fontWeight: 700, color: 'var(--pro-text)', letterSpacing: '-0.03em', lineHeight: 1.04, margin: 0 } as const;
const subtitleStyle = { color: 'var(--mint-400)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em', margin: '18px 0 0' } as const;
const bodyStyle = { color: 'var(--pro-text-dim)', fontSize: 17, lineHeight: 1.6, margin: 0, maxWidth: 640, textWrap: 'pretty' } as CSSProperties;
const metaValueStyle = { margin: 0, color: 'var(--pro-text)', fontSize: 15, fontWeight: 500 } as const;
const offerLinkStyle = { color: 'var(--pro-text)', borderBottom: '1px dashed var(--pro-border-hi)', textDecoration: 'none' } as const;
const statValueStyle = { color: 'var(--pro-text)', fontSize: 34, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1 } as const;
const tileStyle = { height: 56, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 } as const;
const tableFrameStyle = { marginTop: 20, border: '1px solid var(--pro-border)', borderRadius: 10, overflowX: 'auto' } as const;
const tableHeadStyle = { padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pro-text-dim)', fontWeight: 500, textAlign: 'left' } as const;
const cellStyle = { padding: '12px 16px', borderTop: '1px solid var(--pro-border)', minWidth: 0 } as const;
const termRowStyle = { display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: 12, padding: '14px 0', borderTop: '1px solid var(--pro-border)', color: 'var(--pro-text)', fontSize: 15, lineHeight: 1.55 } as const;
const buttonStyle = {
  height: 38,
  padding: '0 16px',
  borderRadius: 8,
  background: 'var(--mint-500)',
  color: '#04221b',
  border: '1px solid transparent',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  letterSpacing: '-0.005em',
  textDecoration: 'none',
} as const;
const noticeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  padding: '12px 16px',
  marginBottom: 16,
  borderRadius: 10,
  background: 'rgba(212,150,31,0.12)',
  border: '1px solid rgba(212,150,31,0.45)',
  color: 'var(--pro-text)',
  fontSize: 14,
} as const;
const noticeKickerStyle = { color: '#e7b34a', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 } as const;

import { useEffect, useState } from 'react';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption, Mono } from '../components/ui/Mono';
import { Icon } from '../components/ui/Icon';
import {
  basescanAddress,
  basescanTx,
  buyerDisplay,
  getActivity,
  getStats,
  servicePath,
  timeAgo,
  type PublicActivityRow,
  type PublicStats,
} from '../lib/api';

interface ActivityPageProps {
  initialActivity?: PublicActivityRow[];
  initialStats?: PublicStats | null;
  initialServiceCount?: number;
}

const REFRESH_MS = 30_000;

export function ActivityPage({
  initialActivity = [],
  initialStats = null,
  initialServiceCount = 0,
}: ActivityPageProps) {
  const [activity, setActivity] = useState<PublicActivityRow[]>(initialActivity);
  const [stats, setStats] = useState<PublicStats | null>(initialStats);
  const [loading, setLoading] = useState(initialActivity.length === 0 && !initialStats);
  const [tickSeconds, setTickSeconds] = useState(REFRESH_MS / 1000);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const load = async () => {
      try {
        const [a, s] = await Promise.all([getActivity(50), getStats()]);
        if (cancelled) return;
        setActivity(a.activity);
        setStats(s);
        setLoading(false);
      } catch {
        // leave previous state in place; the countdown will trigger another try
      }
    };

    // Only do an immediate client load if we had no SSR data; otherwise
    // wait for the first scheduled refresh so the UI doesn't flicker.
    if (initialActivity.length === 0 && !initialStats) {
      load();
    }
    timer = window.setInterval(load, REFRESH_MS);
    const tickTimer = window.setInterval(() => {
      setTickSeconds((s) => (s <= 1 ? REFRESH_MS / 1000 : s - 1));
    }, 1000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      window.clearInterval(tickTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Section pad="88px 32px 48px">
        <div style={{ maxWidth: 880 }}>
          <Caption style={{ marginBottom: 18 }}>activity · sandbox</Caption>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: 'var(--pro-text)',
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
              margin: 0,
            }}
          >
            What's happening on <span style={{ color: 'var(--mint-400)' }}>the marketplace.</span>
          </h1>
          <p
            style={{
              color: 'var(--pro-text-dim)',
              fontSize: 17,
              lineHeight: 1.6,
              margin: '22px 0 0',
              maxWidth: 700,
            }}
          >
            Live numbers from the marketplace and the settlement layer underneath. Honest small
            numbers: they grow as agents start buying.
          </p>
        </div>
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="marketplace" title="The numbers." />
        <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="dk-stat-row dk-stat-cols-3">
            <BigStat
              label="services available"
              // Count distinct services, not providers — one provider can list
              // several. Prefer the gateway's serviceCount; fall back to the
              // SSR /services list length until that field ships.
              value={(stats?.marketplace.serviceCount ?? initialServiceCount).toString()}
              hint="on the marketplace"
            />
            <BigStat
              label="agent purchases"
              value={(stats?.marketplace.paidCount ?? activity.length).toString()}
              hint="all-time"
            />
            <BigStat
              label="total spent by agents"
              value={`${stats?.marketplace.totalVolumeUsdc ?? '0.00'} USDC`}
              hint="across all services"
              last
            />
          </div>
        </div>
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead
          kicker="recent purchases"
          title="Latest agent transactions."
          subtitle="The most recent settlements through Daski. Each row links to Basescan."
          action={
            <Mono dim style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--mint-400)',
                  animation: 'dk-pulse 1.6s ease-in-out infinite',
                }}
              />
              refreshing · {tickSeconds}s
            </Mono>
          }
        />
        <div className="dk-table" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <div className="dk-table-head dk-activity-row">
            <span>Agent</span>
            <span>Service</span>
            <span>Paid</span>
            <span>Skill</span>
            <span>When</span>
            <span>Receipt</span>
          </div>
          {loading && activity.length === 0 ? (
            <div style={{ padding: '24px 16px', color: 'var(--pro-text-dim)' }}>loading…</div>
          ) : activity.length === 0 ? (
            <div style={{ padding: '24px 16px', color: 'var(--pro-text-dim)' }}>
              No paid activity yet. Be the first agent through.
            </div>
          ) : (
            activity.map((r, i) => (
              <div
                key={r.txHash}
                className="dk-activity-row"
                style={{
                  padding: '12px 16px',
                  gap: 16,
                  borderBottom: i < activity.length - 1 ? '1px solid var(--pro-border)' : 'none',
                  alignItems: 'center',
                  color: 'var(--pro-text)',
                }}
              >
                <Mono>{buyerDisplay(r)}</Mono>
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <ServiceCell row={r} />
                </span>
                <span style={{ color: 'var(--mint-400)' }}>
                  {r.amount} <span style={{ color: 'var(--pro-text-dim)' }}>USDC</span>
                </span>
                <span
                  style={{
                    color: 'var(--pro-text-dim)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.skillId ?? '-'}
                </span>
                <span style={{ color: 'var(--pro-text-dim)' }}>{timeAgo(r.timestamp)}</span>
                <a
                  href={basescanTx(r.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="dk-basescan-link"
                  style={{ color: 'var(--mint-400)', textTransform: 'none', letterSpacing: 0, fontSize: 11 }}
                >
                  tx <Icon name="external" size={11} />
                </a>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section pad="64px 32px 0">
        <SectionHead
          kicker="settlement layer"
          title="The chain underneath."
          subtitle="The same data that you'd see on Basescan, surfaced here for anyone digging into how settlement works."
        />
        <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="dk-stat-row dk-stat-cols-3">
            <BigStat
              label="network"
              value={stats ? networkLabel(stats.chain.network) : 'Base Sepolia'}
              hint={stats ? `testnet · ${stats.chain.chainId}` : 'testnet · 84532'}
              mono={false}
            />
            <BigStat
              label="block height"
              value={stats ? Number(stats.chain.blockNumber).toLocaleString() : '-'}
              hint="live"
            />
            <BigStat
              label="on-chain volume"
              value={`${stats?.marketplace.totalVolumeUsdc ?? '0.00'} USDC`}
              hint="settled · all-time"
              last
            />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Caption style={{ marginBottom: 10 }}>contract addresses · base sepolia</Caption>
          <div
            style={{
              border: '1px solid var(--pro-border)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--pro-surface)',
            }}
          >
            {contractRows(stats).map((c, i, arr) => (
              <div
                key={c.name}
                className="dk-contracts-row"
                style={{
                  padding: '14px 20px',
                  gap: 16,
                  borderBottom: i < arr.length - 1 ? '1px solid var(--pro-border)' : 'none',
                  alignItems: 'center',
                  color: 'var(--pro-text)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name="file" size={14} color="var(--pro-text-dim)" />
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</span>
                </div>
                <code
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--mint-400)',
                    background: 'transparent',
                    padding: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.addr}
                </code>
                <a
                  href={basescanAddress(c.addr)}
                  target="_blank"
                  rel="noreferrer"
                  className="dk-basescan-link"
                >
                  basescan <Icon name="external" size={11} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

/**
 * Service column for an activity row: the specific service purchased,
 * linked to its detail page when the gateway supplied a slug. Falls back to
 * the provider's primary name (older gateway builds without per-row service
 * identity), then '-'.
 */
function ServiceCell({ row }: { row: PublicActivityRow }) {
  const label = row.serviceName ?? row.providerName ?? '-';
  if (row.serviceSlug) {
    return (
      <a
        className="dk-service-link"
        href={servicePath({ agentId: row.providerAgentId, serviceSlug: row.serviceSlug })}
      >
        {label}
      </a>
    );
  }
  return <span style={{ color: 'var(--pro-text)' }}>{label}</span>;
}

function BigStat({
  label,
  value,
  hint,
  last,
  mono = true,
}: {
  label: string;
  value: string;
  hint?: string;
  last?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        padding: '24px 28px',
        borderRight: last ? 'none' : '1px solid var(--pro-border)',
      }}
    >
      <Caption style={{ marginBottom: 12 }}>{label}</Caption>
      <div
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: 32,
          fontWeight: 600,
          color: 'var(--pro-text)',
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
      {hint && (
        <Mono dim style={{ marginTop: 8, display: 'block', fontSize: 11, letterSpacing: '0.04em' }}>
          {hint}
        </Mono>
      )}
    </div>
  );
}

function contractRows(stats: PublicStats | null) {
  const c = stats?.contracts;
  const rows: { name: string; addr: string }[] = [
    { name: 'PaymentRouter', addr: c?.paymentRouter ?? '0x…' },
    { name: 'IdentityRegistry', addr: c?.identityRegistry ?? '0x…' },
    { name: 'ProviderRegistry', addr: c?.providerRegistry ?? '0x…' },
  ];
  if (c?.serviceRegistry) {
    rows.push({ name: 'ServiceRegistry', addr: c.serviceRegistry });
  }
  rows.push(
    { name: 'x402 Adapter', addr: c?.x402Adapter ?? '0x…' },
    { name: 'USDC (Base Sepolia)', addr: c?.usdc ?? '0x036cbd53842c5426634e7929541ec2318f3dcf7e' },
  );
  return rows;
}

function networkLabel(network: string): string {
  if (network === 'base-sepolia') return 'Base Sepolia';
  if (network === 'base') return 'Base';
  return network;
}

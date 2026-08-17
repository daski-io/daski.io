import { useEffect, useMemo, useState } from 'react';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption, Mono } from '../components/ui/Mono';
import { Icon } from '../components/ui/Icon';
import {
  basescanAddress,
  getRailMetadata,
  servicePath,
  type StandardRailMetadata,
} from '../lib/api';
import {
  marketplacePresentation,
  relativeTime,
} from '../lib/marketplacePresentation';

const REFRESH_MS = 30_000;

export function ActivityPage({
  initialMetadata = null,
}: {
  initialMetadata?: StandardRailMetadata | null;
}) {
  const [metadata, setMetadata] = useState(initialMetadata);
  const [loading, setLoading] = useState(initialMetadata === null);
  const [tickSeconds, setTickSeconds] = useState(REFRESH_MS / 1_000);
  const presentation = useMemo(() => marketplacePresentation(metadata), [metadata]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await getRailMetadata();
        if (!cancelled) setMetadata(next);
      } catch {
        // Keep the last verified projection until the next refresh.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (!initialMetadata) void load();
    const refreshTimer = window.setInterval(() => void load(), REFRESH_MS);
    const tickTimer = window.setInterval(() => {
      setTickSeconds((seconds) => seconds <= 1 ? REFRESH_MS / 1_000 : seconds - 1);
    }, 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.clearInterval(tickTimer);
    };
  }, [initialMetadata]);

  return (
    <div>
      <Section pad="88px 32px 48px">
        <div style={{ maxWidth: 880 }}>
          <Caption style={{ marginBottom: 18 }}>activity · testnet</Caption>
          <h1 style={heroStyle}>
            What&apos;s happening on <span style={{ color: 'var(--mint-400)' }}>the marketplace.</span>
          </h1>
          <p style={introStyle}>
            Live finalized numbers from the marketplace and its standard x402 settlement layer.
            Honest small numbers: they grow as agents start buying.
          </p>
        </div>
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="marketplace" title="The numbers." />
        <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="dk-stat-row dk-stat-cols-3">
            <BigStat label="services available" value={presentation.serviceCount.toString()} hint="on the marketplace" />
            <BigStat label="agent purchases" value={presentation.transactionCount} hint="finalized · all-time" />
            <BigStat label="total spent by agents" value={`${presentation.totalPaid} USDC`} hint="across all services" last />
          </div>
        </div>
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead
          kicker="recent purchases"
          title="Latest agent transactions."
          subtitle="Finalized standard-rail purchases, with buyer identities and private receipts redacted."
          action={<RefreshStatus seconds={tickSeconds} />}
        />
        <div className="dk-table" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <div className="dk-table-head dk-activity-public-row">
            <span>Service</span><span>Paid</span><span>Outcome</span><span>When</span>
          </div>
          {loading && presentation.purchases.length === 0 ? (
            <EmptyRow>loading…</EmptyRow>
          ) : presentation.purchases.length === 0 ? (
            <EmptyRow>No finalized paid activity yet.</EmptyRow>
          ) : presentation.purchases.slice(0, 50).map((purchase, index, rows) => (
            <div
              key={`${purchase.outcome.outcomeId}:${purchase.timestamp}:${index}`}
              className="dk-activity-public-row"
              style={tableRowStyle(index < rows.length - 1)}
            >
              <a className="dk-service-link" href={servicePath({
                agentId: purchase.outcome.providerAgentId,
                serviceSlug: purchase.outcome.outcomeId,
              })}>
                {purchase.outcome.title}
              </a>
              <span style={{ color: 'var(--mint-400)' }}>
                {formatAtomicPurchase(purchase.amount)} <span style={{ color: 'var(--pro-text-dim)' }}>USDC</span>
              </span>
              <span style={ellipsisStyle}>{purchase.outcome.outcomeId}</span>
              <span style={{ color: 'var(--pro-text-dim)' }}>{relativeTime(purchase.timestamp)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section pad="64px 32px 0">
        <SectionHead
          kicker="settlement layer"
          title="The chain underneath."
          subtitle="The same immutable payment routes agents verify before signing a standard x402 purchase."
        />
        <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="dk-stat-row dk-stat-cols-3">
            <BigStat label="network" value={networkLabel(metadata)} hint={metadata ? `testnet · ${metadata.chainId}` : 'testnet · 84532'} mono={false} />
            <BigStat label="finalized block" value={formatBlock(presentation.finalizedBlock)} hint="reputation projection" />
            <BigStat label="on-chain volume" value={`${presentation.totalPaid} USDC`} hint="settled · all-time" last />
          </div>
        </div>
        <ContractRows metadata={metadata} />
      </Section>
    </div>
  );
}

function BigStat({ label, value, hint, last, mono = true }: {
  label: string; value: string; hint?: string; last?: boolean; mono?: boolean;
}) {
  return (
    <div style={{ padding: '24px 28px', borderRight: last ? 'none' : '1px solid var(--pro-border)' }}>
      <Caption style={{ marginBottom: 12 }}>{label}</Caption>
      <div style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: 32, fontWeight: 600, color: 'var(--pro-text)', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
        {value}
      </div>
      {hint && <Mono dim style={{ marginTop: 8, display: 'block', fontSize: 11 }}>{hint}</Mono>}
    </div>
  );
}

function ContractRows({ metadata }: { metadata: StandardRailMetadata | null }) {
  const rows = metadata ? [
    { name: 'USDC (Base Sepolia)', address: metadata.paymentRail.asset },
    ...metadata.outcomes.map((outcome) => ({ name: `${outcome.title} splitter`, address: outcome.payTo })),
  ] : [];
  return (
    <div style={{ marginTop: 20 }}>
      <Caption style={{ marginBottom: 10 }}>contract addresses · base sepolia</Caption>
      <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.length === 0 ? <EmptyRow>Verified contract metadata unavailable.</EmptyRow> : rows.map((row, index) => (
          <div key={`${row.name}:${row.address}`} className="dk-contracts-row" style={tableRowStyle(index < rows.length - 1)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="file" size={14} color="var(--pro-text-dim)" />
              <span style={{ fontWeight: 500, fontSize: 14 }}>{row.name}</span>
            </div>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mint-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.address}</code>
            <a href={basescanAddress(row.address)} target="_blank" rel="noreferrer" className="dk-basescan-link">
              basescan <Icon name="external" size={11} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefreshStatus({ seconds }: { seconds: number }) {
  return <Mono dim style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint-400)', animation: 'dk-pulse 1.6s ease-in-out infinite' }} />refreshing · {seconds}s</Mono>;
}

function EmptyRow({ children }: { children: string }) {
  return <div style={{ padding: '24px 16px', color: 'var(--pro-text-dim)' }}>{children}</div>;
}

function formatAtomicPurchase(value: string): string {
  const atomic = BigInt(value);
  const whole = atomic / 1_000_000n;
  const fraction = (atomic % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function networkLabel(metadata: StandardRailMetadata | null): string {
  if (!metadata) return 'Base Sepolia';
  return metadata.network === 'base-sepolia' ? 'Base Sepolia' : metadata.network;
}

function formatBlock(value: string | null): string {
  return value ? BigInt(value).toLocaleString('en-US') : '–';
}

function tableRowStyle(hasBorder: boolean) {
  return { padding: '12px 16px', gap: 16, borderBottom: hasBorder ? '1px solid var(--pro-border)' : 'none', alignItems: 'center', color: 'var(--pro-text)' };
}

const heroStyle = { fontSize: 56, fontWeight: 700, color: 'var(--pro-text)', letterSpacing: '-0.03em', lineHeight: 1.04, margin: 0 };
const introStyle = { color: 'var(--pro-text-dim)', fontSize: 17, lineHeight: 1.6, margin: '22px 0 0', maxWidth: 700 };
const ellipsisStyle = { color: 'var(--pro-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

import { useEffect, useMemo, useRef, useState } from 'react';
import { Caption, Mono } from '../components/ui/Mono';
import { Icon } from '../components/ui/Icon';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import {
  atomicUsdc,
  basescanAddress,
  basescanTx,
  buyerDisplay,
  getRailMetadata,
  servicePath,
  type StandardRailMetadata,
} from '../lib/api';
import { marketplacePresentation, relativeTime } from '../lib/marketplacePresentation';

const REFRESH_MS = 30_000;

export function ActivityPage({
  initialMetadata = null,
  initialError = null,
}: {
  initialMetadata?: StandardRailMetadata | null;
  initialError?: string | null;
}) {
  const [metadata, setMetadata] = useState(initialMetadata);
  const [loading, setLoading] = useState(initialMetadata === null && initialError === null);
  const [error, setError] = useState(initialError);
  const [tickSeconds, setTickSeconds] = useState(REFRESH_MS / 1_000);
  const reportedRefreshError = useRef(false);
  const presentation = useMemo(() => marketplacePresentation(metadata), [metadata]);
  const hasVerifiedData = metadata !== null;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await getRailMetadata();
        if (!cancelled) {
          setMetadata(next);
          setError(null);
          reportedRefreshError.current = false;
        }
      } catch (loadError) {
        if (!cancelled) {
          setError('Live chain data is temporarily unavailable.');
          if (!reportedRefreshError.current) {
            console.error('Failed to refresh verified chain metadata', loadError);
            reportedRefreshError.current = true;
          }
        }
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
            Live numbers from the marketplace and the settlement layer underneath. Honest small
            numbers: they grow as agents start buying.
          </p>
          {error && <DataStatus hasVerifiedData={hasVerifiedData} />}
        </div>
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="marketplace" title="The numbers." />
        <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="dk-stat-row dk-stat-cols-3">
            <BigStat label="services available" value={hasVerifiedData ? presentation.serviceCount.toString() : '–'} hint="on the marketplace" />
            <BigStat label="agent purchases" value={hasVerifiedData ? presentation.transactionCount : '–'} hint="finalized · all-time" />
            <BigStat label="total spent by agents" value={hasVerifiedData ? `${presentation.totalPaid} USDC` : '–'} hint="across all services" last />
          </div>
        </div>
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead
          kicker="recent purchases"
          title="Latest agent transactions."
          subtitle="The most recent settlements through Daski. Each available receipt links to Basescan."
          action={<RefreshStatus seconds={tickSeconds} />}
        />
        <div className="dk-table" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <div className="dk-table-head dk-activity-row">
            <span>Agent</span><span>Service</span><span>Paid</span>
            <span>Skill</span><span>When</span><span>Receipt</span>
          </div>
          {loading && !hasVerifiedData ? (
            <EmptyRow>loading…</EmptyRow>
          ) : !hasVerifiedData ? (
            <EmptyRow>Live chain data is unavailable. Retrying automatically…</EmptyRow>
          ) : presentation.purchases.length === 0 ? (
            <EmptyRow>No finalized paid activity yet.</EmptyRow>
          ) : presentation.purchases.slice(0, 50).map((purchase, index, rows) => (
            <div
              key={purchase.orderKey}
              className="dk-activity-row"
              style={tableRowStyle(index < rows.length - 1)}
            >
              <Mono>{buyerDisplay(purchase)}</Mono>
              <a className="dk-service-link" href={servicePath({
                serviceId: purchase.outcome.serviceId,
              })}>
                {purchase.outcome.service.name}
              </a>
              <span style={{ color: 'var(--mint-400)' }}>
                {atomicUsdc(purchase.amount)} <span style={{ color: 'var(--pro-text-dim)' }}>USDC</span>
              </span>
              <span style={ellipsisStyle}>{purchase.outcome.skill.name}</span>
              <span style={{ color: 'var(--pro-text-dim)' }}>{relativeTime(purchase.timestamp)}</span>
              {purchase.txHash ? (
                <a href={basescanTx(purchase.txHash)} target="_blank" rel="noreferrer" className="dk-basescan-link" style={receiptStyle}>
                  tx <Icon name="external" size={11} />
                </a>
              ) : <Mono dim>–</Mono>}
            </div>
          ))}
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
            <BigStat label="network" value={networkLabel(metadata)} hint={metadata ? `testnet · ${metadata.chainId}` : 'testnet · 84532'} mono={false} />
            <BigStat label="block height" value={formatBlock(presentation.safeBlock)} hint="safe" />
            <BigStat label="on-chain volume" value={hasVerifiedData ? `${presentation.totalPaid} USDC` : '–'} hint="settled · all-time" last />
          </div>
        </div>
        <ContractRows metadata={metadata} />
      </Section>
    </div>
  );
}

function DataStatus({ hasVerifiedData }: { hasVerifiedData: boolean }) {
  return (
    <div role="status" className="dk-card" style={statusStyle}>
      <Icon name="bolt" size={16} color="var(--pro-warning, #f5b942)" />
      <div>
        <div style={{ color: 'var(--pro-text)', fontWeight: 600, fontSize: 13 }}>
          {hasVerifiedData ? 'Live refresh delayed.' : 'Chain data unavailable.'}
        </div>
        <div style={{ color: 'var(--pro-text-dim)', fontSize: 12, marginTop: 3 }}>
          {hasVerifiedData
            ? 'Showing the last verified projection while automatic retries continue.'
            : 'No verified projection has loaded. Automatic retries are continuing.'}
        </div>
      </div>
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
  const contracts = metadata?.contracts;
  const rows = contracts ? [
    { name: 'AgentIndex', address: contracts.agentIndex },
    { name: 'ProviderRegistry', address: contracts.providerRegistry },
    { name: 'ServiceRegistry', address: contracts.serviceRegistry },
    { name: 'ValidationRegistry', address: contracts.validationRegistry },
    { name: 'ReputationStorage', address: contracts.reputationStorage },
  ] : [];
  return (
    <div style={{ marginTop: 20 }}>
      <Caption style={{ marginBottom: 10 }}>contract addresses · base sepolia</Caption>
      <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.length === 0 ? <EmptyRow>Verified contract metadata unavailable.</EmptyRow> : rows.map((row, index) => (
          <div key={row.name} className="dk-contracts-row" style={tableRowStyle(index < rows.length - 1)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="file" size={14} color="var(--pro-text-dim)" />
              <span style={{ fontWeight: 500, fontSize: 14 }}>{row.name}</span>
            </div>
            <code style={contractStyle}>{row.address}</code>
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
const statusStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 24, padding: '14px 16px', maxWidth: 700 } as const;
const ellipsisStyle = { color: 'var(--pro-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
const receiptStyle = { color: 'var(--mint-400)', textTransform: 'none', letterSpacing: 0, fontSize: 11 } as const;
const contractStyle = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mint-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

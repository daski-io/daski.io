import { useEffect, useRef, useState } from 'react';
import { Caption, Mono } from '../components/ui/Mono';
import { Icon } from '../components/ui/Icon';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { atomicUsdc, buyerDisplay, getRailMetadata, servicePath } from '../lib/api';
import { explorerAddress, explorerTx, type NetworkView } from '../lib/chains';
import {
  activityView,
  relativeTime,
  type ActivityView,
} from '../lib/marketplacePresentation';

const REFRESH_MS = 30_000;

export function ActivityPage({
  network,
  initialView = null,
  initialFetchedAt = null,
  initialError = null,
}: {
  network: NetworkView;
  initialView?: ActivityView | null;
  initialFetchedAt?: number | null;
  initialError?: string | null;
}) {
  const { gatewayUrl, chainId } = network;
  // A network without a gateway has nothing to poll: the page shows its empty
  // states rather than the unavailable state, which is reserved for a gateway
  // that exists but does not answer.
  const unpublished = gatewayUrl === null;
  const [view, setView] = useState(initialView);
  const [loading, setLoading] = useState(
    !unpublished && initialView === null && initialError === null,
  );
  const [error, setError] = useState(initialError);
  const [tickSeconds, setTickSeconds] = useState(REFRESH_MS / 1_000);
  const reportedRefreshError = useRef(false);
  const hasVerifiedData = view !== null;

  useEffect(() => {
    if (gatewayUrl === null) return;
    const target = { url: gatewayUrl, chainId };
    let cancelled = false;
    const load = async () => {
      try {
        const next = activityView(await getRailMetadata(target));
        if (!cancelled) {
          setView(next);
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
    // The server renders from a cached snapshot. Refresh right away when that
    // snapshot is older than one polling interval so the numbers catch up.
    const stale = initialFetchedAt === null || Date.now() - initialFetchedAt >= REFRESH_MS;
    if (!initialView || stale) void load();
    const refreshTimer = window.setInterval(() => void load(), REFRESH_MS);
    const tickTimer = window.setInterval(() => {
      setTickSeconds((seconds) => seconds <= 1 ? REFRESH_MS / 1_000 : seconds - 1);
    }, 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.clearInterval(tickTimer);
    };
  }, [gatewayUrl, chainId, initialView, initialFetchedAt]);

  const label = network.label.toLowerCase();

  return (
    <div>
      <Section pad="88px 32px 48px">
        <div style={{ maxWidth: 880 }}>
          <Caption style={{ marginBottom: 18 }}>activity · {label}</Caption>
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
            <BigStat
              label="services available"
              value={view ? view.serviceCount.toString() : unpublished ? '0' : '–'}
              hint="on the marketplace"
            />
            <BigStat
              label="agent purchases"
              value={view ? view.transactionCount : unpublished ? '0' : '–'}
              hint="finalized · all-time"
            />
            <BigStat
              label="total spent by agents"
              value={view ? `${view.totalPaid} USDC` : unpublished ? '0 USDC' : '–'}
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
          subtitle="The most recent settlements through Daski. Each available receipt links to Basescan."
          action={unpublished ? undefined : <RefreshStatus seconds={tickSeconds} />}
        />
        <div className="dk-table" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <div className="dk-table-head dk-activity-row">
            <span>Agent</span><span>Service</span><span>Paid</span>
            <span>Skill</span><span>When</span><span>Receipt</span>
          </div>
          {unpublished ? (
            <EmptyRow>No finalized paid activity yet.</EmptyRow>
          ) : loading && !view ? (
            <EmptyRow>loading…</EmptyRow>
          ) : !view ? (
            <EmptyRow>Live chain data is unavailable. Retrying automatically…</EmptyRow>
          ) : view.purchases.length === 0 ? (
            <EmptyRow>No finalized paid activity yet.</EmptyRow>
          ) : view.purchases.map((purchase, index, rows) => (
            <div
              key={purchase.orderKey}
              className="dk-activity-row"
              style={tableRowStyle(index < rows.length - 1)}
            >
              <Mono>{buyerDisplay(purchase)}</Mono>
              <a className="dk-service-link" href={servicePath(purchase)}>
                {purchase.serviceName}
              </a>
              <span style={{ color: 'var(--mint-400)' }}>
                {atomicUsdc(purchase.amount)} <span style={{ color: 'var(--pro-text-dim)' }}>USDC</span>
              </span>
              <span style={ellipsisStyle}>{purchase.skillName}</span>
              <span style={{ color: 'var(--pro-text-dim)' }}>{relativeTime(purchase.timestamp)}</span>
              {purchase.txHash ? (
                <a
                  href={explorerTx(network.explorerUrl, purchase.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="dk-basescan-link"
                  style={receiptStyle}
                >
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
            <BigStat
              label="network"
              value={network.chainName}
              hint={`${label} · ${network.chainId}`}
              mono={false}
            />
            <BigStat label="block height" value={formatBlock(view?.safeBlock ?? null)} hint="safe" />
            <BigStat
              label="on-chain volume"
              value={view ? `${view.totalPaid} USDC` : unpublished ? '0 USDC' : '–'}
              hint="settled · all-time"
              last
            />
          </div>
        </div>
        <ContractRows contracts={view?.contracts ?? null} network={network} unpublished={unpublished} />
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

function ContractRows({ contracts, network, unpublished }: {
  contracts: ActivityView['contracts'] | null;
  network: NetworkView;
  unpublished: boolean;
}) {
  const rows = contracts ? [
    { name: 'AgentIndex', address: contracts.agentIndex },
    { name: 'ProviderRegistry', address: contracts.providerRegistry },
    { name: 'ServiceRegistry', address: contracts.serviceRegistry },
    { name: 'ValidationRegistry', address: contracts.validationRegistry },
    { name: 'ReputationStorage', address: contracts.reputationStorage },
  ] : [];
  return (
    <div style={{ marginTop: 20 }}>
      <Caption style={{ marginBottom: 10 }}>contract addresses · {network.chainName.toLowerCase()}</Caption>
      <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <EmptyRow>
            {unpublished ? 'No contract addresses published yet.' : 'Verified contract metadata unavailable.'}
          </EmptyRow>
        ) : rows.map((row, index) => (
          <div key={row.name} className="dk-contracts-row" style={tableRowStyle(index < rows.length - 1)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="file" size={14} color="var(--pro-text-dim)" />
              <span style={{ fontWeight: 500, fontSize: 14 }}>{row.name}</span>
            </div>
            <code style={contractStyle}>{row.address}</code>
            <a
              href={explorerAddress(network.explorerUrl, row.address)}
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
  );
}

function RefreshStatus({ seconds }: { seconds: number }) {
  return <Mono dim style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint-400)', animation: 'dk-pulse 1.6s ease-in-out infinite' }} />refreshing · {seconds}s</Mono>;
}

function EmptyRow({ children }: { children: string }) {
  return <div style={{ padding: '24px 16px', color: 'var(--pro-text-dim)' }}>{children}</div>;
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

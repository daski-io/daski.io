import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption, Mono } from '../components/ui/Mono';
import { Pill } from '../components/ui/Pill';
import { Icon, type IconName } from '../components/ui/Icon';
import { Addr } from '../components/ui/Addr';
import {
  basescanAddress,
  basescanNft,
  basescanTx,
  categoryToIcon,
  getServiceDetail,
  getStats,
  priceRange,
  shortBuyer,
  timeAgo,
  type PublicServiceLevelReputation,
  type PublicServiceReputation,
  type PublicSkill,
  type PublicStats,
  type ServiceDetail,
} from '../lib/api';

export function ServiceDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    // Stats fetched in parallel so the on-chain identity links to
    // IdentityRegistry / ServiceRegistry don't need a second waterfall.
    Promise.all([getServiceDetail(agentId, ctrl.signal), getStats(ctrl.signal)])
      .then(([s, st]) => {
        setService(s);
        setStats(st);
        setLoading(false);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'unknown error');
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [agentId]);

  if (loading && !service) {
    return (
      <Section pad="88px 32px 48px">
        <Mono dim>loading service…</Mono>
      </Section>
    );
  }
  if (error || !service) {
    return (
      <Section pad="88px 32px 48px">
        <h1 style={{ color: 'var(--pro-text)', fontSize: 32 }}>Service not found</h1>
        <p style={{ color: 'var(--pro-text-dim)' }}>{error ?? 'No service with that id.'}</p>
        <Link to="/" style={{ color: 'var(--mint-400)', borderBottom: 'none' }}>
          ← Back to services
        </Link>
      </Section>
    );
  }

  const m = categoryToIcon(service.category);
  const totalPaid =
    service.serviceReputation?.totalTransactions ??
    service.reputation?.totalTransactions ??
    null;

  const headerTiles: StatTile[] = [
    { label: 'Price range', value: priceRange(service), mint: true },
    { label: 'Avg completion', value: service.turnaroundEstimate ?? '-' },
    { label: 'Total purchases', value: totalPaid !== null ? totalPaid.toString() : '–' },
    { label: 'Active skills', value: service.skills.length.toString() },
  ];

  return (
    <div style={{ background: 'var(--pro-bg)' }}>
      <Section pad="24px 32px 0">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--pro-text-dim)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <Link
            to="/"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--pro-text-dim)',
              cursor: 'pointer',
              padding: 0,
              borderBottom: 'none',
            }}
          >
            services
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--pro-text)' }}>agent#{service.agentId}</span>
        </div>
      </Section>

      <Section pad="24px 32px 32px">
        <ServiceCatIcon iconName={m.name} color={m.color} />
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            margin: '20px 0 16px',
            color: 'var(--pro-text)',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
          }}
        >
          {service.name}
        </h1>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {service.skills
            .filter((s) => s.paymentRequired)
            .slice(0, 6)
            .map((c) => (
              <span key={c.id} className="dk-skill-chip">
                {c.id}
              </span>
            ))}
        </div>
        <p
          style={{
            color: 'var(--pro-text-dim)',
            fontSize: 17,
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 760,
          }}
        >
          {service.serviceDescription ??
            'A real service offered to AI agents on the Daski marketplace. The agent pays in USDC on Base, the provider fulfils via A2A, and a verified completion lands on-chain.'}
        </p>

        <ServiceBox
          headerTiles={headerTiles}
          serviceReputation={service.serviceReputation}
          serviceId={service.serviceId}
          serviceSlug={service.serviceSlug}
          serviceVersion={service.serviceVersion}
          serviceRegistry={stats?.contracts.serviceRegistry ?? null}
        />
      </Section>

      <Section pad="0 32px 0">
        <SectionHead kicker="provided by" title={null} />
        <ProvidedByBox
          service={service}
          identityRegistry={stats?.contracts.identityRegistry ?? null}
        />
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="skills offered" title="Under this service." />
        <SkillsTable skills={service.skills} />
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="recent purchases of this service" title={null} />
        <RecentPurchases purchases={service.recentPurchases} />
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="how to use this service from your agent" title={null} />
        <div className="dk-grid-2" style={{ gap: 20 }}>
          <div className="dk-card" style={{ padding: 22 }}>
            <Caption style={{ marginBottom: 12 }}>step 1 · install</Caption>
            <CommandLine cmd="claude mcp add daski https://sandbox-gateway.daski.io/mcp" />
            <p style={{ color: 'var(--pro-text-dim)', fontSize: 13, marginTop: 12, lineHeight: 1.55 }}>
              One-click copy. Compatible with Claude Code, Cursor, and any MCP-aware agent.
            </p>
          </div>
          <div className="dk-card" style={{ padding: 22 }}>
            <Caption style={{ marginBottom: 12 }}>step 2 · prompt your agent</Caption>
            <CommandLine cmd="Register the domain example.xyz" prompt />
            <p style={{ color: 'var(--pro-text-dim)', fontSize: 13, marginTop: 12, lineHeight: 1.55 }}>
              Or let it decide on its own. The agent discovers, pays, and verifies. No further input
              needed.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

interface StatTile {
  label: string;
  value: string;
  sub?: string | null;
  mint?: boolean;
}

function StatTileRow({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className={`dk-stat-row dk-stat-cols-${tiles.length}`}>
      {tiles.map((t, i) => (
        <div
          key={t.label}
          className="dk-stat-tile"
          style={{
            borderRight: i < tiles.length - 1 ? '1px solid var(--pro-border)' : 'none',
          }}
        >
          <Caption style={{ marginBottom: 10 }}>{t.label}</Caption>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 22,
              fontWeight: 600,
              color: t.mint ? 'var(--mint-400)' : 'var(--pro-text)',
              letterSpacing: '-0.01em',
            }}
          >
            {t.value}
          </div>
          {t.sub && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--pro-text-dim)',
                letterSpacing: '0.02em',
                marginTop: 4,
              }}
            >
              {t.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface RepStatItem {
  label: string;
  value: string;
  mint?: boolean;
}

function RepStatRow({ items }: { items: RepStatItem[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'baseline' }}>
      {items.map((it) => (
        <div key={it.label}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              fontWeight: 600,
              color: it.mint ? 'var(--mint-400)' : 'var(--pro-text)',
              letterSpacing: '-0.01em',
            }}
          >
            {it.value}
          </div>
          <Mono
            dim
            style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}
          >
            {it.label}
          </Mono>
        </div>
      ))}
    </div>
  );
}

function ServiceBox({
  headerTiles,
  serviceReputation,
  serviceId,
  serviceSlug,
  serviceVersion,
  serviceRegistry,
}: {
  headerTiles: StatTile[];
  serviceReputation: PublicServiceLevelReputation | null;
  serviceId: string | null;
  serviceSlug: string | null;
  serviceVersion: string | null;
  serviceRegistry: string | null;
}) {
  return (
    <div className="dk-box" style={{ marginTop: 28 }}>
      <StatTileRow tiles={headerTiles} />

      {serviceReputation && (
        <div className="dk-rep-section">
          <Caption style={{ marginBottom: 10 }}>reputation · this service</Caption>
          <RepStatRow items={serviceReputationStats(serviceReputation)} />
        </div>
      )}

      {serviceId && (
        <>
          <div className="dk-box-divider">
            <Caption>on-chain · serviceRegistry</Caption>
          </div>
          <OnChainRow
            label="ServiceRegistry row"
            value={shortHash(serviceId)}
            href={serviceRegistry ? basescanAddress(serviceRegistry) : null}
            hint={
              serviceSlug && serviceVersion
                ? `slug=${serviceSlug} · version=${serviceVersion}`
                : 'mapping keyed by serviceId'
            }
          />
        </>
      )}
    </div>
  );
}

function serviceReputationStats(rep: PublicServiceLevelReputation): RepStatItem[] {
  if (rep.totalTransactions === 0) {
    return [{ label: 'no activity yet', value: '0' }];
  }
  const items: RepStatItem[] = [
    { label: 'purchases', value: rep.totalTransactions.toString() },
    {
      label: 'completion',
      value: rep.completionRate !== null ? `${(rep.completionRate * 100).toFixed(0)}%` : '–',
      mint: true,
    },
  ];
  if (rep.failedCount + rep.canceledCount > 0) {
    items.push({ label: 'failed · canceled', value: `${rep.failedCount} · ${rep.canceledCount}` });
  }
  if (parseFloat(rep.totalRefundedUsdc) > 0) {
    items.push({ label: 'refunded', value: `${rep.totalRefundedUsdc} USDC` });
  }
  return items;
}

function ProvidedByBox({
  service,
  identityRegistry,
}: {
  service: ServiceDetail;
  identityRegistry: string | null;
}) {
  return (
    <div className="dk-box" style={{ marginTop: -8 }}>
      <div style={{ padding: 24 }}>
        {service.providerName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 600,
                margin: 0,
                color: 'var(--pro-text)',
                letterSpacing: '-0.015em',
              }}
            >
              {service.providerName}
            </h3>
            <Pill>verified</Pill>
          </div>
        )}
        {service.providerDescription && (
          <p
            style={{
              color: 'var(--pro-text-dim)',
              fontSize: 14,
              lineHeight: 1.55,
              margin: '0 0 14px',
              fontStyle: 'italic',
            }}
          >
            {service.providerDescription}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
            fontSize: 13,
          }}
        >
          {service.providerA2AUrl && (
            <a
              href={service.providerA2AUrl}
              target="_blank"
              rel="noreferrer"
              className="dk-link-mint"
            >
              <Icon name="external" size={13} /> A2A endpoint
            </a>
          )}
          {service.providerA2AUrl && <span style={{ color: 'var(--pro-border-hi)' }}>·</span>}
          <a
            href={service.agentURI}
            target="_blank"
            rel="noreferrer"
            className="dk-link-mint"
          >
            Agent Card
          </a>
          <span style={{ color: 'var(--pro-border-hi)' }}>·</span>
          <Addr link={basescanAddress(service.providerAddress)} style={{ fontSize: 12 }}>
            {service.providerAddress}
          </Addr>
        </div>

        {service.reputation && (
          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: '1px solid var(--pro-border)',
            }}
          >
            <Caption style={{ marginBottom: 10 }}>provider reputation · all activity</Caption>
            <RepStatRow items={providerReputationStats(service.reputation)} />
          </div>
        )}
      </div>

      <div className="dk-box-divider">
        <Caption>on-chain · identityRegistry</Caption>
      </div>
      <OnChainRow
        label="Provider · ERC-8004 NFT"
        value={`agent#${service.agentId}`}
        href={identityRegistry ? basescanNft(identityRegistry, service.agentId) : null}
        hint={
          identityRegistry
            ? `IdentityRegistry · ${shortHash(identityRegistry)}`
            : 'IdentityRegistry address unavailable'
        }
      />
    </div>
  );
}

function providerReputationStats(rep: PublicServiceReputation): RepStatItem[] {
  if (rep.totalTransactions === 0) {
    return [{ label: 'awaiting first completed task', value: '0' }];
  }
  const items: RepStatItem[] = [
    { label: 'purchases', value: rep.totalTransactions.toString() },
    {
      label: 'completion',
      value: rep.completionRate !== null ? `${(rep.completionRate * 100).toFixed(0)}%` : '–',
      mint: true,
    },
    {
      label: 'buyer-confirmed',
      value:
        rep.buyerSatisfactionRate !== null
          ? `${(rep.buyerSatisfactionRate * 100).toFixed(0)}%`
          : '–',
      mint: true,
    },
  ];
  if (rep.failedCount + rep.canceledCount > 0) {
    items.push({ label: 'failed · canceled', value: `${rep.failedCount} · ${rep.canceledCount}` });
  }
  return items;
}

function OnChainRow({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: string;
  href: string | null;
  hint: string | null;
}) {
  return (
    <div className="dk-onchain-row">
      <div>
        <Caption style={{ marginBottom: 4 }}>{label}</Caption>
        {hint && (
          <Mono dim style={{ fontSize: 11, letterSpacing: '0.02em' }}>
            {hint}
          </Mono>
        )}
      </div>
      <code
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--mint-400)',
          background: 'transparent',
          padding: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </code>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="dk-basescan-link"
        >
          basescan <Icon name="external" size={11} />
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}

function SkillsTable({ skills }: { skills: PublicSkill[] }) {
  return (
    <div className="dk-table">
      <div className="dk-table-head dk-skills-row">
        <span>Skill</span>
        <span>Description</span>
        <span>Price</span>
        <span>Paid</span>
      </div>
      {skills.map((sk, i) => (
        <div
          key={sk.id}
          className="dk-skills-row"
          style={{
            padding: '16px 20px',
            gap: 16,
            alignItems: 'start',
            color: 'var(--pro-text)',
            borderBottom: i < skills.length - 1 ? '1px solid var(--pro-border)' : 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Mono mint>{sk.id}</Mono>
            <SkillTags skill={sk} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--pro-text-dim)' }}>
              {sk.description ?? '-'}
            </span>
            {sk.requiredFields && sk.requiredFields.length > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--pro-text-dim)',
                  letterSpacing: '0.02em',
                  lineHeight: 1.45,
                }}
              >
                fields: {sk.requiredFields.join(', ')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Mono>{sk.basePrice ? `${sk.basePrice} USDC` : sk.variable ? 'live' : '-'}</Mono>
            {sk.pricingModelDetail?.hint && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--pro-text-dim)',
                  lineHeight: 1.4,
                }}
              >
                {sk.pricingModelDetail.source
                  ? `via ${sk.pricingModelDetail.source}`
                  : sk.pricingModelDetail.kind}
              </span>
            )}
          </div>
          <Mono dim>{sk.paymentRequired ? 'yes' : 'free'}</Mono>
        </div>
      ))}
    </div>
  );
}

function RecentPurchases({
  purchases,
}: {
  purchases: ServiceDetail['recentPurchases'];
}) {
  if (purchases.length === 0) {
    return (
      <div
        style={{
          border: '1px solid var(--pro-border)',
          borderRadius: 12,
          background: 'var(--pro-surface)',
          padding: '28px',
          textAlign: 'center',
          color: 'var(--pro-text-dim)',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <Mono
          dim
          style={{
            display: 'block',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          0 purchases · last 24h
        </Mono>
        More instance-level activity will appear here as agents start using this service.
      </div>
    );
  }
  return (
    <div className="dk-table" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <div className="dk-table-head dk-recent-row">
        <span>Agent</span>
        <span>Skill</span>
        <span>Paid</span>
        <span>When</span>
        <span>Receipt</span>
      </div>
      {purchases.map((r) => (
        <div
          key={r.txHash}
          className="dk-recent-row"
          style={{
            padding: '12px 16px',
            gap: 16,
            borderBottom: '1px solid var(--pro-border)',
            alignItems: 'center',
            color: 'var(--pro-text)',
          }}
        >
          <Mono>{shortBuyer(r.buyerAgentId)}</Mono>
          <Mono mint>{r.skillId ?? '-'}</Mono>
          <span style={{ color: 'var(--mint-400)' }}>
            {r.amount} <span style={{ color: 'var(--pro-text-dim)' }}>USDC</span>
          </span>
          <span style={{ color: 'var(--pro-text-dim)' }}>{timeAgo(r.timestamp)}</span>
          <a href={basescanTx(r.txHash)} target="_blank" rel="noreferrer" className="dk-basescan-link">
            tx <Icon name="external" size={11} />
          </a>
        </div>
      ))}
    </div>
  );
}

function shortHash(hex: string): string {
  if (!hex || !hex.startsWith('0x')) return hex;
  if (hex.length <= 14) return hex;
  return `${hex.slice(0, 10)}…${hex.slice(-6)}`;
}

function SkillTags({ skill }: { skill: PublicSkill }) {
  const tags: { label: string; tone: 'warn' | 'dim' }[] = [];
  if (skill.requiresCapability) tags.push({ label: 'capability', tone: 'warn' });
  if (skill.requiresAssetOwnership) tags.push({ label: 'asset-gated', tone: 'dim' });
  if (skill.assetType) tags.push({ label: skill.assetType, tone: 'dim' });
  if (tags.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {tags.map((t) => (
        <span
          key={t.label}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--pro-border)',
            color: t.tone === 'warn' ? '#f0a878' : 'var(--pro-text-dim)',
            letterSpacing: '0.04em',
          }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

function ServiceCatIcon({ iconName, color }: { iconName: IconName; color: string }) {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: 'rgba(52,211,177,0.06)',
        border: `1px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
      }}
    >
      <Icon name={iconName} size={26} />
    </div>
  );
}

function CommandLine({ cmd, prompt }: { cmd: string; prompt?: boolean }) {
  return (
    <div
      style={{
        background: '#06070b',
        border: '1px solid var(--pro-border)',
        borderRadius: 8,
        padding: '10px 10px 10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ color: 'var(--mint-400)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        {prompt ? '›' : '$'}
      </span>
      <code
        style={{
          flex: 1,
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          color: '#cfcfdb',
          background: 'transparent',
          padding: 0,
          overflow: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {cmd}
      </code>
      <CopySmall text={cmd} />
    </div>
  );
}

function CopySmall({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        try {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
      style={{
        height: 26,
        padding: '0 9px',
        borderRadius: 5,
        cursor: 'pointer',
        background: 'transparent',
        border: '1px solid var(--pro-border-hi)',
        color: copied ? 'var(--mint-400)' : 'var(--pro-text-dim)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {copied ? (
        <>
          <Icon name="check" size={11} strokeWidth={2.6} />
          ok
        </>
      ) : (
        <>
          <Icon name="copy" size={11} />
          copy
        </>
      )}
    </button>
  );
}

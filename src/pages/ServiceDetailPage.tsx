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
  basescanTx,
  categoryToIcon,
  getServiceDetail,
  shortBuyer,
  timeAgo,
  type PublicServiceReputation,
  type PublicSkill,
  type ServiceDetail,
} from '../lib/api';

export function ServiceDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    getServiceDetail(agentId, ctrl.signal)
      .then((s) => {
        setService(s);
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
  const stats: { label: string; value: string; mint?: boolean }[] = [
    {
      label: 'Price range',
      value: priceRangeFor(service),
      mint: true,
    },
    {
      label: 'Avg completion',
      value: service.turnaroundEstimate ?? '-',
    },
    {
      label: 'Total purchases',
      value: service.recentPurchases.length.toString(),
    },
    {
      label: 'Active skills',
      value: service.skills.length.toString(),
    },
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
              <span
                key={c.id}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'var(--pro-surface2)',
                  color: 'var(--pro-text)',
                  border: '1px solid var(--pro-border)',
                  letterSpacing: '0.02em',
                }}
              >
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

        <div
          className="grid-2"
          style={{
            marginTop: 28,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            background: 'var(--pro-surface)',
            border: '1px solid var(--pro-border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: '20px 24px',
                borderRight: i < stats.length - 1 ? '1px solid var(--pro-border)' : 'none',
              }}
            >
              <Caption style={{ marginBottom: 10 }}>{s.label}</Caption>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22,
                  fontWeight: 600,
                  color: s.mint ? 'var(--mint-400)' : 'var(--pro-text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section pad="32px 32px 0">
        <SectionHead kicker="trust signals" title={null} />
        <ReputationBlock reputation={service.reputation} />
      </Section>

      <Section pad="24px 32px 0">
        <SectionHead kicker="provided by" title={null} />
        <div className="dk-card" style={{ padding: 24, marginTop: -8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 280 }}>
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
                  <Pill tone="success">verified</Pill>
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
                    style={{
                      color: 'var(--mint-400)',
                      display: 'inline-flex',
                      gap: 6,
                      alignItems: 'center',
                      borderBottom: 'none',
                    }}
                  >
                    <Icon name="external" size={13} /> A2A endpoint
                  </a>
                )}
                <span style={{ color: 'var(--pro-border-hi)' }}>·</span>
                <a
                  href={service.agentURI}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'var(--mint-400)',
                    display: 'inline-flex',
                    gap: 6,
                    alignItems: 'center',
                    borderBottom: 'none',
                  }}
                >
                  Agent Card
                </a>
                <span style={{ color: 'var(--pro-border-hi)' }}>·</span>
                <Addr link={basescanAddress(service.providerAddress)} style={{ fontSize: 12 }}>
                  {service.providerAddress}
                </Addr>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="skills offered" title="Under this service." />
        <div
          style={{
            border: '1px solid var(--pro-border)',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'var(--pro-surface)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 2fr 1fr 1fr',
              padding: '12px 20px',
              gap: 16,
              borderBottom: '1px solid var(--pro-border)',
              background: 'var(--pro-bg)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--pro-text-dim)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span>Skill</span>
            <span>Description</span>
            <span>Price</span>
            <span>Paid</span>
          </div>
          {service.skills.map((sk, i) => (
            <div
              key={sk.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 2fr 1fr 1fr',
                padding: '16px 20px',
                gap: 16,
                alignItems: 'start',
                color: 'var(--pro-text)',
                borderBottom: i < service.skills.length - 1 ? '1px solid var(--pro-border)' : 'none',
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
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="recent purchases of this service" title={null} />
        {service.recentPurchases.length === 0 ? (
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
        ) : (
          <div
            style={{
              border: '1px solid var(--pro-border)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--pro-surface)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '170px 1.4fr 100px 1fr 80px',
                padding: '10px 16px',
                gap: 16,
                borderBottom: '1px solid var(--pro-border)',
                background: 'var(--pro-bg)',
                color: 'var(--pro-text-dim)',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <span>Agent</span>
              <span>Skill</span>
              <span>Paid</span>
              <span>When</span>
              <span>Receipt</span>
            </div>
            {service.recentPurchases.map((r) => (
              <div
                key={r.txHash}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1.4fr 100px 1fr 80px',
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
                <a
                  href={basescanTx(r.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'var(--mint-400)',
                    fontSize: 11,
                    borderBottom: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  tx <Icon name="external" size={11} />
                </a>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="how to use this service from your agent" title={null} />
        <div
          className="grid-2"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
        >
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

function ReputationBlock({
  reputation,
}: {
  reputation: PublicServiceReputation | null;
}) {
  // Three states:
  //   1. null — gateway has no ReputationStorage configured. The contract
  //      isn't deployed in this environment; show nothing rather than a
  //      misleading "0 transactions" tile.
  //   2. configured but no activity — render the empty-state hint so the
  //      whitepaper's "reputation is the recourse" framing makes sense.
  //   3. has activity — derived rates inline.
  if (!reputation) return null;

  const empty = reputation.totalTransactions === 0;
  if (empty) {
    return (
      <div
        style={{
          marginTop: -8,
          border: '1px solid var(--pro-border)',
          borderRadius: 12,
          background: 'var(--pro-surface)',
          padding: '24px',
          color: 'var(--pro-text-dim)',
          fontSize: 14,
          lineHeight: 1.55,
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
          no transaction history yet
        </Mono>
        Provider reputation is computed from on-chain outcome attestations and
        buyer delivery confirmations. Numbers will appear here after the first
        completed task.
      </div>
    );
  }

  const tiles: { label: string; value: string; sub: string | null; mint?: boolean }[] = [
    {
      label: 'Transactions',
      value: reputation.totalTransactions.toString(),
      sub: reputation.failedCount + reputation.canceledCount > 0
        ? `${reputation.failedCount} failed · ${reputation.canceledCount} canceled`
        : 'all completed',
    },
    {
      label: 'Completion rate',
      value:
        reputation.completionRate !== null
          ? `${(reputation.completionRate * 100).toFixed(0)}%`
          : '–',
      sub: `${reputation.completedCount} of ${reputation.totalTransactions}`,
      mint: true,
    },
    {
      label: 'Buyer-confirmed',
      value:
        reputation.buyerSatisfactionRate !== null
          ? `${(reputation.buyerSatisfactionRate * 100).toFixed(0)}%`
          : '–',
      sub:
        reputation.buyerSatisfactionRate !== null
          ? `${reputation.confirmedCount} of ${
              reputation.confirmedCount + reputation.notConfirmedCount
            }`
          : 'awaiting confirmations',
      mint: true,
    },
  ];

  return (
    <div
      className="grid-2"
      style={{
        marginTop: -8,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        background: 'var(--pro-surface)',
        border: '1px solid var(--pro-border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {tiles.map((t, i) => (
        <div
          key={t.label}
          style={{
            padding: '20px 24px',
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

function SkillTags({ skill }: { skill: PublicSkill }) {
  const tags: { label: string; tone: 'warn' | 'mint' | 'dim' }[] = [];
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
            color:
              t.tone === 'warn'
                ? '#f0a878'
                : t.tone === 'mint'
                  ? 'var(--mint-400)'
                  : 'var(--pro-text-dim)',
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

function priceRangeFor(s: ServiceDetail): string {
  const paid = s.skills.filter((sk) => sk.paymentRequired);
  const numbers = paid
    .map((sk) => (sk.basePrice ? Number(sk.basePrice) : null))
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  if (numbers.length > 0) {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return min === max ? `${min.toFixed(2)} USDC` : `${min.toFixed(2)} – ${max.toFixed(2)} USDC`;
  }
  if (s.pricing.basePrice) return `${Number(s.pricing.basePrice).toFixed(2)} USDC`;
  return 'live';
}

import { useState } from 'react';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption, Mono } from '../components/ui/Mono';
import { Icon, type IconName } from '../components/ui/Icon';
import { Addr } from '../components/ui/Addr';
import { ServiceTaxonomyChips } from '../components/ServiceTaxonomyChips';
import {
  basescanAddress,
  basescanTx,
  buyerDisplay,
  priceDisplay,
  timeAgo,
  type PublicSkill,
  type PublicSkillStats,
  type ServiceDetail,
} from '../lib/api';
import { categoryFamilyConfig } from '../config/service-taxonomy';

interface ServiceDetailPageProps {
  service: ServiceDetail;
}

export function ServiceDetailPage({ service }: ServiceDetailPageProps) {
  const family = categoryFamilyConfig(service.categoryFamily);
  const sRep = service.serviceReputation;
  const price = priceDisplay(service);

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
          <a
            href="/"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--pro-text-dim)',
              cursor: 'pointer',
              padding: 0,
              borderBottom: 'none',
              textDecoration: 'none',
            }}
          >
            services
          </a>
          <span>/</span>
          <span style={{ color: 'var(--pro-text)' }}>{service.name}</span>
        </div>
      </Section>

      <Section pad="24px 32px 32px">
        <ServiceHeaderMark
          iconUrl={service.iconUrl}
          providerName={service.providerName}
          fallbackIcon={family.icon}
          fallbackColor={family.color}
        />
        <h1
          className="dk-service-h1"
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
        <ServiceTaxonomyChips
          categoryFamily={service.categoryFamily}
          serviceType={service.serviceType}
          style={{ marginBottom: 12 }}
        />
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

        {/* Service stats — unified 6-cell grid (Option 1). */}
        <div
          style={{
            marginTop: 28,
            border: '1px solid var(--pro-border)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <div
            className="dk-stat-grid dk-collapse-6-to-3"
            style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
          >
            <StatCell label="Price" value={price.value} unit={price.unit} mint />
            <StatCell
              label="All-time Purchases"
              value={sRep ? sRep.totalTransactions.toString() : '–'}
            />
            <StatCell
              label="All-time Sales"
              value={sRep ? formatUsdc(sRep.totalSpentUsdc) : '–'}
              unit={sRep ? 'USDC' : null}
            />
            <StatCell
              label="Avg Completion Time"
              value={formatSeconds(sRep?.averageFulfillmentSeconds ?? null)}
            />
            <StatCell label="Completion Rate" value={formatRate(sRep?.completionRate ?? null)} />
            <StatCell
              label="Buyer Satisfaction"
              value={formatRate(
                // USDC-value-weighted (log2 curve, $0.25 floor) — the
                // anti-Sybil display metric. Falls back to the count-based
                // rate when no attestations land above the floor; falls
                // back further to null (rendered as '–') when there's no
                // signal at all.
                sRep?.buyerSatisfactionRateByValue ??
                  sRep?.buyerSatisfactionRate ??
                  null,
              )}
            />
          </div>
        </div>
      </Section>

      <Section pad="0 32px 0">
        <SectionHead kicker="provided by" title={null} />
        <ProvidedByBox service={service} />
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="skills offered" title={null} />
        <SkillsTable skills={service.skills} stats={service.skillStats} />
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

function StatCell({
  label,
  value,
  unit,
  mint,
}: {
  label: string;
  value: string;
  unit?: string | null;
  mint?: boolean;
}) {
  return (
    <div
      style={{
        padding: '22px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          color: 'var(--pro-text-dim)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 22,
          fontWeight: 600,
          color: mint ? 'var(--mint-400)' : 'var(--pro-text)',
          letterSpacing: '-0.01em',
          lineHeight: 1.05,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--pro-text-dim)',
              letterSpacing: '0.04em',
              marginLeft: 6,
            }}
          >
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

function ProvStatCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string | null;
}) {
  return (
    <div
      style={{
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          color: 'var(--pro-text-dim)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--pro-text)',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--pro-text-dim)',
              letterSpacing: '0.04em',
              marginLeft: 6,
            }}
          >
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

function ProvidedByBox({ service }: { service: ServiceDetail }) {
  return (
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
        <div style={{ flex: 1, minWidth: 240, maxWidth: 720 }}>
          {service.providerName && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
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
              &ldquo;{service.providerDescription}&rdquo;
            </p>
          )}
          <div
            style={{
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            {service.providerWebsite && (
              <>
                <a
                  href={service.providerWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="dk-link-mint"
                >
                  <Icon name="external" size={13} /> Website
                </a>
                <span style={{ color: 'var(--pro-border-hi)' }}>·</span>
              </>
            )}
            <a href={service.agentURI} target="_blank" rel="noreferrer" className="dk-link-mint">
              Provider Card
            </a>
            <span style={{ color: 'var(--pro-border-hi)' }}>·</span>
            <Addr link={basescanAddress(service.providerAddress)} style={{ fontSize: 12 }}>
              {service.providerAddress}
            </Addr>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              alignItems: 'center',
              fontSize: 13,
              marginTop: 14,
            }}
          >
            <span style={{ color: 'var(--pro-text)' }}>
              Contracting party: {service.legal.providerLegalName}
            </span>
            <a
              href={service.legal.providerTermsUrl}
              target="_blank"
              rel="noreferrer"
              className="dk-link-mint"
            >
              Provider Terms
            </a>
            <a
              href={service.legal.providerPrivacyUrl}
              target="_blank"
              rel="noreferrer"
              className="dk-link-mint"
            >
              Provider Privacy
            </a>
            <a href={service.legal.marketplaceTermsUrl} className="dk-link-mint">
              Daski Terms
            </a>
            <a href={service.legal.marketplacePrivacyUrl} className="dk-link-mint">
              Daski Privacy
            </a>
          </div>
        </div>
      </div>

      {service.reputation && (
        <>
          <div style={{ marginTop: 22, height: 1, background: 'var(--pro-border)' }} />
          <div
            className="dk-stat-grid dk-collapse-4-to-2"
            style={{ marginTop: 18, gridTemplateColumns: 'repeat(4, 1fr)' }}
          >
            <ProvStatCell
              label="All-time Purchases"
              value={service.reputation.totalTransactions.toString()}
            />
            <ProvStatCell
              label="All-time Sales"
              value={formatUsdc(service.reputation.totalSpentUsdc)}
              unit="USDC"
            />
            <ProvStatCell
              label="Completion Rate"
              value={formatRate(service.reputation.completionRate)}
            />
            <ProvStatCell
              label="Buyer Satisfaction"
              value={formatRate(
                // USDC-value-weighted (log2 curve, $0.25 floor) — same
                // anti-Sybil metric used on the service-level card.
                // Falls back to count-based when no attestations land
                // above the floor.
                service.reputation.buyerSatisfactionRateByValue ??
                  service.reputation.buyerSatisfactionRate,
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}

function formatRate(r: number | null): string {
  return r !== null ? `${(r * 100).toFixed(0)}%` : '–';
}

function formatUsdc(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

function formatSeconds(sec: number | null): string {
  if (sec === null || sec < 0) return '–';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Format the Price cell of the combined skills table per the design:
//   - flat price (no live pricing)        → "$X.XX"
//   - variable pricing + ≥2 settled txs   → "variable · avg. $X.XX"
//   - variable pricing + 0–1 txs          → "variable"
//   - paymentRequired false               → "free"
function formatSkillPrice(
  sk: PublicSkill,
  stat: PublicSkillStats | undefined,
): string {
  if (!sk.paymentRequired) return 'free';
  if (sk.variable) {
    if (stat && stat.totalTransactions > 1) {
      const avg = Number(stat.totalSpentUsdc) / stat.totalTransactions;
      return `variable · avg. $${avg.toFixed(2)}`;
    }
    return 'variable';
  }
  return sk.basePrice ? `$${sk.basePrice}` : 'variable';
}

/**
 * Combined skills + per-skill performance table. Each row carries the
 * catalog info (skill id, price) alongside settled stats (volume,
 * completion, satisfaction, median time). A More/Less toggle expands an
 * inline description card — matches the design's expandable skill row
 * pattern (see design ref `provider.jsx` in the handoff bundle).
 *
 * Stats come from gateway `skillStats[]` joined by skillId. Skills that
 * have no settled transactions still appear (catalog-only row) with
 * dashes in the stats columns.
 */
function SkillsTable({
  skills,
  stats,
}: {
  skills: PublicSkill[];
  stats: PublicSkillStats[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) =>
    setOpen((o) => ({ ...o, [id]: !o[id] }));

  const statsById = new Map(stats.map((s) => [s.skillId, s]));

  // 7 columns, fixed widths on the numerics so the table aligns when
  // values vary in length. Last column reserved for the More/Less
  // toggle. Numbers right-aligned on the design; we keep them in-flow
  // for simplicity since column widths bound the dispersion already.
  const COLS = '1.1fr 1.6fr 1fr 1fr 1fr 1fr 76px';

  return (
    <div className="dk-table" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 880 }}>
          <div
            className="dk-table-head"
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              gap: 16,
              padding: '12px 20px',
            }}
          >
            <span>Skill</span>
            <span>Price</span>
            <span>All-time Sales</span>
            <span>Avg Completion</span>
            <span>Completion Rate</span>
            <span>Buyer Satisfaction</span>
            <span />
          </div>
          {skills.map((sk, i) => {
            const stat = statsById.get(sk.id);
            const isOpen = !!open[sk.id];
            const isLast = i === skills.length - 1;
            return (
              <div
                key={sk.id}
                style={{
                  borderBottom: isLast ? 'none' : '1px solid var(--pro-border)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: COLS,
                    gap: 16,
                    padding: '16px 20px',
                    alignItems: 'center',
                    color: 'var(--pro-text)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Mono mint style={{ fontSize: 13 }}>{sk.id}</Mono>
                    <SkillTags skill={sk} />
                  </div>
                  <Mono style={{ fontSize: 13 }}>{formatSkillPrice(sk, stat)}</Mono>
                  <Mono style={{ fontSize: 13 }}>
                    {stat ? formatUsdc(stat.totalSpentUsdc) : '–'}
                    {stat && (
                      <span style={{ color: 'var(--pro-text-dim)', marginLeft: 6, fontSize: 11 }}>
                        USDC
                      </span>
                    )}
                  </Mono>
                  <Mono style={{ fontSize: 13 }}>
                    {formatSeconds(stat?.medianFulfillmentSeconds ?? null)}
                  </Mono>
                  <Mono style={{ fontSize: 13 }}>{formatRate(stat?.completionRate ?? null)}</Mono>
                  {/*
                    USDC-value-weighted satisfaction (log2 curve, $0.25
                    floor) — the anti-Sybil display metric. Falls back to
                    count-based when no attestations land above the floor.
                  */}
                  <Mono style={{ fontSize: 13 }}>
                    {formatRate(
                      stat?.buyerSatisfactionRateByValue ??
                        stat?.buyerSatisfactionRate ??
                        null,
                    )}
                  </Mono>
                  <button
                    onClick={() => toggle(sk.id)}
                    aria-expanded={isOpen}
                    style={{
                      height: 26,
                      padding: '0 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: 'transparent',
                      border: `1px solid ${isOpen ? 'var(--mint-700)' : 'var(--pro-border-hi)'}`,
                      color: isOpen ? 'var(--mint-400)' : 'var(--pro-text-dim)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      justifySelf: 'end',
                      transition: 'color 160ms ease, border-color 160ms ease',
                    }}
                  >
                    {isOpen ? 'Less' : 'More'}
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-flex',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms ease',
                        fontSize: 9,
                        lineHeight: 1,
                      }}
                    >
                      ▾
                    </span>
                  </button>
                </div>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 20px 18px',
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: 8,
                        background: '#06070b',
                        border: '1px solid var(--pro-border)',
                        color: 'var(--pro-text)',
                        fontSize: 13.5,
                        lineHeight: 1.6,
                      }}
                    >
                      <Mono
                        dim
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        description
                      </Mono>
                      {sk.description ?? '–'}
                      {sk.requiredFields && sk.requiredFields.length > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid var(--pro-border)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--pro-text-dim)',
                            letterSpacing: '0.02em',
                            lineHeight: 1.45,
                          }}
                        >
                          fields: {sk.requiredFields.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
  // Mirror the /activity table layout (minus Service column): same column
  // order (Agent | Paid | Skill | When | Receipt), same monospace styling,
  // same row spacing, same dim/mint color treatments. Chain-only rows
  // render skill as `-` exactly like /activity does.
  return (
    <div className="dk-table" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <div className="dk-table-head dk-recent-row">
        <span>Agent</span>
        <span>Paid</span>
        <span>Skill</span>
        <span>When</span>
        <span>Receipt</span>
      </div>
      {purchases.map((r, i) => (
        <div
          key={r.txHash}
          className="dk-recent-row"
          style={{
            padding: '12px 16px',
            gap: 16,
            borderBottom: i < purchases.length - 1 ? '1px solid var(--pro-border)' : 'none',
            alignItems: 'center',
            color: 'var(--pro-text)',
          }}
        >
          <Mono>{buyerDisplay(r)}</Mono>
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
      ))}
    </div>
  );
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

function ServiceHeaderMark({
  iconUrl,
  providerName,
  fallbackIcon,
  fallbackColor,
}: {
  iconUrl?: string | null;
  providerName: string | null;
  fallbackIcon: IconName;
  fallbackColor: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!iconUrl && !imgFailed;
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: showImg ? '#e0e0e8' : 'rgba(52,211,177,0.06)',
        border: `1px solid ${showImg ? 'var(--pro-border)' : fallbackColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: fallbackColor,
        overflow: 'hidden',
      }}
    >
      {showImg ? (
        <img
          src={iconUrl ?? undefined}
          alt={providerName ? `${providerName} logo` : 'Provider logo'}
          width={56}
          height={56}
          loading="lazy"
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <Icon name={fallbackIcon} size={26} />
      )}
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

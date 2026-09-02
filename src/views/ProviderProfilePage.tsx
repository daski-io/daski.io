import type { CSSProperties } from 'react';
import {
  atomicUsdc,
  basescanAddress,
  basescanTx,
  buyerDisplay,
  priceRange,
  reputationRate,
  servicePath,
  type ProviderDetail,
  type StandardRailMetadata,
} from '../lib/api';
import {
  providerProfilePresentation,
  type ProviderPurchase,
  type ProviderServicePresentation,
} from '../lib/providerPresentation';
import { relativeTime } from '../lib/marketplacePresentation';
import { Addr } from '../components/ui/Addr';
import { Icon } from '../components/ui/Icon';
import { Mono } from '../components/ui/Mono';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';

interface ProviderProfilePageProps {
  provider: ProviderDetail;
  metadata: StandardRailMetadata | null;
  chainDataUnavailable?: boolean;
}

export function ProviderProfilePage({
  provider,
  metadata,
  chainDataUnavailable = false,
}: ProviderProfilePageProps) {
  const presentation = providerProfilePresentation(provider, metadata);
  const reputation = presentation.reputation;
  const satisfaction = reputation
    ? reputation.valueWeightedBuyerSatisfactionRate ?? reputation.buyerSatisfactionRate
    : null;
  const initials = provider.providerName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{ background: 'var(--pro-bg)' }}>
      <Section pad="24px 32px 0">
        <div style={breadcrumbStyle}>
          <a href="/" style={breadcrumbLinkStyle}>services</a>
          <span>/</span>
          <span>providers</span>
          <span>/</span>
          <span style={{ color: 'var(--pro-text)' }}>#{provider.providerAgentId}</span>
        </div>
      </Section>

      <Section pad="24px 32px 32px">
        <div style={providerMarkStyle}>{initials}</div>
        <h1 className="dk-service-h1" style={titleStyle}>{provider.providerName}</h1>
        <p style={aboutStyle}>
          {provider.services.length} live service{provider.services.length === 1 ? '' : 's'} available
          to AI agents through the Daski marketplace.
        </p>

        <div style={linkRowStyle}>
          <ExternalLink href={provider.providerA2AUrl}>Website</ExternalLink>
          <Dot />
          <ExternalLink href={provider.agentCardUrl}>Provider Card</ExternalLink>
          <Dot />
          <ExternalLink href={provider.legal.providerTermsUrl}>Terms of Use</ExternalLink>
          <Dot />
          <ExternalLink href={provider.legal.providerPrivacyUrl}>Privacy Policy</ExternalLink>
          <Dot />
          <Addr link={basescanAddress(provider.providerAddress)} style={{ fontSize: 12 }}>
            {provider.providerAddress}
          </Addr>
        </div>

        <div style={statsFrameStyle}>
          <div
            className="dk-stat-grid dk-collapse-4-to-2"
            style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
          >
            <ProviderStat
              label="All-time Purchases"
              value={reputation?.transactionCount ?? '–'}
            />
            <ProviderStat
              label="All-time Sales"
              value={reputation ? atomicUsdc(reputation.totalPaid) : '–'}
              unit={reputation ? 'USDC' : undefined}
            />
            <ProviderStat
              label="Completion Rate"
              value={reputationRate(reputation?.completionRate ?? null)}
            />
            <ProviderStat
              label="Buyer Satisfaction"
              value={reputationRate(satisfaction)}
            />
          </div>
        </div>

        {reputation?.safeBlock && (
          <Mono dim style={safeBlockStyle}>
            Aggregates read from on-chain reputation storage at safe block {reputation.safeBlock}.
          </Mono>
        )}
        {chainDataUnavailable && (
          <div role="status" className="dk-card" style={statusStyle}>
            On-chain marketplace data is temporarily unavailable. Provider identity and live
            services are still shown from the gateway catalog.
          </div>
        )}
      </Section>

      <Section pad="24px 32px 0">
        <SectionHead kicker="services offered by this provider" title={null} />
        <ProviderServicesTable rows={presentation.services} />
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="recent purchases of this provider" title={null} />
        <ProviderPurchasesTable rows={presentation.purchases} />
      </Section>
    </div>
  );
}

function Dot() {
  return <span style={{ color: 'var(--pro-border-hi)' }}>·</span>;
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="dk-link-mint">
      {children} <Icon name="external" size={11} />
    </a>
  );
}

function ProviderStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div style={statCellStyle}>
      <span style={statLabelStyle}>{label}</span>
      <span style={statValueStyle}>
        {value}
        {unit && <span style={statUnitStyle}>{unit}</span>}
      </span>
    </div>
  );
}

function ProviderServicesTable({ rows }: { rows: ProviderServicePresentation[] }) {
  const columns = '1.7fr 1.1fr 1fr 1fr 1fr 1.1fr 40px';

  return (
    <div className="dk-table">
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 880 }}>
          <div className="dk-table-head" style={{ display: 'grid', gridTemplateColumns: columns }}>
            <span>Service</span>
            <span>Price</span>
            <span>All-time Purchases</span>
            <span>All-time Sales</span>
            <span>Completion Rate</span>
            <span>Buyer Satisfaction</span>
            <span />
          </div>
          {rows.map(({ service, reputation }, index) => {
            const satisfaction = reputation
              ? reputation.valueWeightedBuyerSatisfactionRate
                ?? reputation.buyerSatisfactionRate
              : null;

            return (
              <a
                key={service.serviceId}
                href={servicePath(service)}
                className="dk-rowlink"
                style={{
                  display: 'grid',
                  gridTemplateColumns: columns,
                  padding: '16px 20px',
                  gap: 16,
                  alignItems: 'center',
                  borderBottom: index === rows.length - 1
                    ? 'none'
                    : '1px solid var(--pro-border)',
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                <span style={serviceNameStyle}>{service.name}</span>
                <Mono mint style={{ fontSize: 13 }}>{priceRange(service)}</Mono>
                <Mono style={{ fontSize: 13 }}>{reputation?.transactionCount ?? '–'}</Mono>
                <Mono style={{ fontSize: 13 }}>
                  {reputation ? atomicUsdc(reputation.totalPaid) : '–'}
                  {reputation && <span style={tableUnitStyle}>USDC</span>}
                </Mono>
                <Mono style={{ fontSize: 13 }}>
                  {reputationRate(reputation?.completionRate ?? null)}
                </Mono>
                <Mono style={{ fontSize: 13 }}>{reputationRate(satisfaction)}</Mono>
                <span style={{ justifySelf: 'end', color: 'var(--pro-text-dim)' }}>
                  <Icon name="arrow" size={12} />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProviderPurchasesTable({ rows }: { rows: ProviderPurchase[] }) {
  const columns = '1.3fr 0.9fr 1.3fr 1.2fr 0.9fr 70px';

  return (
    <div className="dk-table">
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 880 }}>
          <div className="dk-table-head" style={{ display: 'grid', gridTemplateColumns: columns }}>
            <span>Agent</span>
            <span>Paid</span>
            <span>Service</span>
            <span>Skill</span>
            <span style={{ textAlign: 'right' }}>When</span>
            <span style={{ textAlign: 'right' }}>Receipt</span>
          </div>
          {rows.length === 0 ? (
            <EmptyTableRow>No finalized purchases for this provider yet.</EmptyTableRow>
          ) : rows.map((purchase, index) => (
            <div
              key={purchase.orderKey}
              style={{
                display: 'grid',
                gridTemplateColumns: columns,
                padding: '16px 20px',
                gap: 16,
                alignItems: 'center',
                borderBottom: index === rows.length - 1
                  ? 'none'
                  : '1px solid var(--pro-border)',
              }}
            >
              <Mono style={buyerStyle}>{buyerDisplay(purchase)}</Mono>
              <Mono style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--mint-400)' }}>{atomicUsdc(purchase.amount)}</span>
                <span style={tableUnitStyle}>USDC</span>
              </Mono>
              <a href={servicePath({ serviceId: purchase.outcome.serviceId })} className="dk-service-link">
                {purchase.outcome.service.name}
              </a>
              <Mono dim style={ellipsisStyle}>{purchase.outcome.skill.name}</Mono>
              <Mono dim style={{ fontSize: 13, textAlign: 'right' }}>
                {relativeTime(purchase.timestamp)}
              </Mono>
              {purchase.txHash ? (
                <a
                  href={basescanTx(purchase.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  style={receiptStyle}
                >
                  tx <Icon name="external" size={12} />
                </a>
              ) : (
                <Mono dim style={{ justifySelf: 'end' }}>–</Mono>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyTableRow({ children }: { children: string }) {
  return <div style={emptyRowStyle}>{children}</div>;
}

const breadcrumbStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--pro-text-dim)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};
const breadcrumbLinkStyle: CSSProperties = {
  color: 'var(--pro-text-dim)',
  borderBottom: 'none',
  textDecoration: 'none',
};
const providerMarkStyle: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 12,
  background: 'rgba(52,211,177,0.06)',
  border: '1px solid var(--mint-400)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-mono)',
  fontSize: 20,
  fontWeight: 600,
  color: 'var(--mint-400)',
  letterSpacing: '0.02em',
};
const titleStyle: CSSProperties = {
  fontSize: 48,
  fontWeight: 700,
  margin: '20px 0 14px',
  color: 'var(--pro-text)',
  letterSpacing: '-0.03em',
  lineHeight: 1.05,
};
const aboutStyle: CSSProperties = {
  color: 'var(--pro-text-dim)',
  fontSize: 17,
  lineHeight: 1.55,
  margin: 0,
  maxWidth: 760,
  fontStyle: 'italic',
};
const linkRowStyle: CSSProperties = {
  display: 'flex',
  gap: 14,
  flexWrap: 'wrap',
  alignItems: 'center',
  fontSize: 13,
  marginTop: 18,
};
const statsFrameStyle: CSSProperties = {
  marginTop: 28,
  border: '1px solid var(--pro-border)',
  borderRadius: 14,
  overflow: 'hidden',
};
const statCellStyle: CSSProperties = {
  padding: '22px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 0,
};
const statLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  color: 'var(--pro-text-dim)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  lineHeight: 1.3,
};
const statValueStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 22,
  fontWeight: 600,
  color: 'var(--pro-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1.05,
  whiteSpace: 'nowrap',
};
const statUnitStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--pro-text-dim)',
  letterSpacing: '0.04em',
  marginLeft: 6,
};
const safeBlockStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  marginTop: 12,
};
const statusStyle: CSSProperties = {
  padding: '14px 16px',
  marginTop: 16,
  color: 'var(--pro-text-dim)',
  fontSize: 13,
  lineHeight: 1.55,
};
const serviceNameStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--pro-text)',
  letterSpacing: '-0.01em',
};
const tableUnitStyle: CSSProperties = {
  color: 'var(--pro-text-dim)',
  marginLeft: 6,
  fontSize: 11,
};
const buyerStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--pro-text)',
};
const ellipsisStyle: CSSProperties = {
  fontSize: 13,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
const receiptStyle: CSSProperties = {
  justifySelf: 'end',
  borderBottom: 'none',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  color: 'var(--mint-400)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};
const emptyRowStyle: CSSProperties = {
  padding: '24px 20px',
  color: 'var(--pro-text-dim)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
};

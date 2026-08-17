import {
  atomicUsdc,
  basescanAddress,
  reputationRate,
  shortAddress,
  type ServiceDetail,
} from '../../lib/api';
import { Addr } from '../ui/Addr';
import { Icon } from '../ui/Icon';
import { Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

export function ProviderAndRailDetails({ service }: { service: ServiceDetail }) {
  const rail = service.standardRail;
  const reputation = rail.providerReputation;
  const satisfaction = reputation.valueWeightedBuyerSatisfactionRate
    ?? reputation.buyerSatisfactionRate;
  const providerShare = 10_000 - rail.commissionBps;

  return (
    <>
      <Section pad="0 32px 0">
        <SectionHead kicker="provided by" title={null} />
        <div className="dk-card" style={{ padding: 24, marginTop: -8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240, maxWidth: 760 }}>
              <h3 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 10px', color: 'var(--pro-text)', letterSpacing: '-0.015em' }}>
                {service.providerName ?? service.legal.providerLegalName}
              </h3>
              {service.providerDescription && (
                <p style={{ color: 'var(--pro-text-dim)', fontSize: 14, lineHeight: 1.55, margin: '0 0 14px', fontStyle: 'italic' }}>
                  &ldquo;{service.providerDescription}&rdquo;
                </p>
              )}
              <div style={linkRowStyle}>
                {service.providerWebsite && <ExternalLink href={service.providerWebsite}>Website</ExternalLink>}
                <ExternalLink href={service.agentURI}>Provider endpoint</ExternalLink>
                <Addr link={basescanAddress(service.providerAddress)} style={{ fontSize: 12 }}>
                  {service.providerAddress}
                </Addr>
              </div>
              <div style={{ ...linkRowStyle, marginTop: 14 }}>
                <span style={{ color: 'var(--pro-text)' }}>Contracting party: {service.legal.providerLegalName}</span>
                <ExternalLink href={service.legal.providerTermsUrl}>Provider Terms</ExternalLink>
                <ExternalLink href={service.legal.providerPrivacyUrl}>Provider Privacy</ExternalLink>
                <a href={service.legal.marketplaceTermsUrl} className="dk-link-mint">Daski Terms</a>
                <a href={service.legal.marketplacePrivacyUrl} className="dk-link-mint">Daski Privacy</a>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 22, height: 1, background: 'var(--pro-border)' }} />
          <div className="dk-stat-grid dk-collapse-4-to-2" style={{ marginTop: 18, gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <ProviderStat label="All-time Purchases" value={reputation.transactionCount} />
            <ProviderStat label="All-time Sales" value={atomicUsdc(reputation.totalPaid)} unit="USDC" />
            <ProviderStat label={`Completion Rate (${reputation.completionSampleSize})`} value={reputationRate(reputation.completionRate)} />
            <ProviderStat label={`Buyer Satisfaction (${reputation.confirmationSampleSize})`} value={reputationRate(satisfaction)} />
          </div>
        </div>
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead
          kicker="standard rail"
          title="The payment route."
          subtitle="These are the signed and immutable facts the agent verifies before paying."
        />
        <div className="dk-box">
          <div className="dk-stat-row dk-stat-cols-4">
            <RailStat label="Settlement" value="USDC · Exact-EVM" />
            <RailStat label="Provider share" value={`${(providerShare / 100).toFixed(2)}%`} />
            <RailStat label="Daski commission" value={`${(rail.commissionBps / 100).toFixed(2)}%`} />
            <RailStat label="Open-order capacity" value={rail.capacityPolicy.maxOpenOrders.toString()} />
          </div>
          <div className="dk-box-divider"><Mono dim>signed listing and immutable route</Mono></div>
          <RailAddress label="Provider payee" value={rail.providerPayee} />
          <RailAddress label="Outcome splitter" value={rail.payTo} />
          <RailValue label="Listing manifest" value={shortAddress(rail.listingManifestHash, 18, 12)} />
          <RailValue label="Provider offer" value={shortAddress(rail.providerOfferHash, 18, 12)} last />
        </div>
      </Section>
    </>
  );
}

function ProviderStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={smallLabelStyle}>{label}</span>
      <span style={providerValueStyle}>{value}{unit && <span style={unitStyle}>{unit}</span>}</span>
    </div>
  );
}

function RailStat({ label, value }: { label: string; value: string }) {
  return <div className="dk-stat-tile"><span style={smallLabelStyle}>{label}</span><Mono style={{ display: 'block', marginTop: 8, fontSize: 17 }}>{value}</Mono></div>;
}

function RailAddress({ label, value }: { label: string; value: string }) {
  return (
    <div className="dk-onchain-row" style={{ borderBottom: '1px solid var(--pro-border)' }}>
      <span>{label}</span><Addr link={basescanAddress(value)}>{value}</Addr>
      <a href={basescanAddress(value)} target="_blank" rel="noreferrer" className="dk-basescan-link">basescan <Icon name="external" size={11} /></a>
    </div>
  );
}

function RailValue({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <div className="dk-onchain-row" style={{ borderBottom: last ? 'none' : '1px solid var(--pro-border)' }}><span>{label}</span><Mono>{value}</Mono><span /></div>;
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noreferrer" className="dk-link-mint"><Icon name="external" size={13} />{children}</a>;
}

const linkRowStyle = { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 } as const;
const smallLabelStyle = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--pro-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.3 } as const;
const providerValueStyle = { fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--pro-text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' } as const;
const unitStyle = { fontSize: 11, color: 'var(--pro-text-dim)', letterSpacing: '0.04em', marginLeft: 6 };

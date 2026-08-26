import {
  atomicUsdc,
  basescanAddress,
  primaryOutcome,
  reputationRate,
  type ServiceDetail,
} from '../../lib/api';
import { Addr } from '../ui/Addr';
import { Icon } from '../ui/Icon';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

export function ProviderAndRailDetails({ service }: { service: ServiceDetail }) {
  const outcome = primaryOutcome(service);
  const reputation = outcome.providerReputation;
  const satisfaction = reputation.valueWeightedBuyerSatisfactionRate
    ?? reputation.buyerSatisfactionRate;

  return (
    <Section pad="0 32px 0">
      <SectionHead kicker="provided by" title={null} />
      <div className="dk-card" style={{ padding: 24, marginTop: -8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 720 }}>
            <h3 style={providerTitleStyle}>
              {service.providerName ?? service.legal.providerLegalName}
            </h3>
            {service.providerDescription && (
              <p style={descriptionStyle}>&ldquo;{service.providerDescription}&rdquo;</p>
            )}
            <div style={linkRowStyle}>
              {service.providerWebsite && <ExternalLink href={service.providerWebsite}>Website</ExternalLink>}
              <a href={outcome.service.agentCardUrl} target="_blank" rel="noreferrer" className="dk-link-mint">Details</a>
              <Addr link={basescanAddress(service.providerAddress)} style={{ fontSize: 12 }}>
                {service.providerAddress}
              </Addr>
            </div>
            <div style={{ ...linkRowStyle, marginTop: 14 }}>
              {service.agentURI && <ExternalLink href={service.agentURI}>Provider Card</ExternalLink>}
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
          <ProviderStat label="Completion Rate" value={reputationRate(reputation.completionRate)} />
          <ProviderStat label="Buyer Satisfaction" value={reputationRate(satisfaction)} />
        </div>
      </div>
    </Section>
  );
}

function ProviderStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={smallLabelStyle}>{label}</span>
      <span style={providerValueStyle}>
        {value}{unit && <span style={unitStyle}>{unit}</span>}
      </span>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noreferrer" className="dk-link-mint"><Icon name="external" size={13} />{children}</a>;
}

const providerTitleStyle = { fontSize: 22, fontWeight: 600, margin: '0 0 10px', color: 'var(--pro-text)', letterSpacing: '-0.015em' };
const descriptionStyle = { color: 'var(--pro-text-dim)', fontSize: 14, lineHeight: 1.55, margin: '0 0 14px', fontStyle: 'italic' } as const;
const linkRowStyle = { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 } as const;
const smallLabelStyle = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--pro-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.3 } as const;
const providerValueStyle = { fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--pro-text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' } as const;
const unitStyle = { fontSize: 11, color: 'var(--pro-text-dim)', letterSpacing: '0.04em', marginLeft: 6 };

import {
  basescanAddress,
  type ServiceDetail,
} from '../../lib/api';
import { Addr } from '../ui/Addr';
import { Icon } from '../ui/Icon';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

export function ProviderAndRailDetails({ service }: { service: ServiceDetail }) {
  return (
    <Section pad="0 32px 0">
      <SectionHead kicker="provided by" title={null} />
      <div className="dk-card" style={{ padding: 24, marginTop: -8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 840 }}>
            <h3 style={providerTitleStyle}>{service.legal.providerLegalName}</h3>
            <div style={linkRowStyle}>
              <ExternalLink href={service.agentCardUrl}>Service card</ExternalLink>
              <ExternalLink href={service.providerA2AUrl}>Provider origin</ExternalLink>
              <Addr link={basescanAddress(service.providerAddress)} style={{ fontSize: 12 }}>
                {service.providerAddress}
              </Addr>
            </div>
            <div style={{ ...linkRowStyle, marginTop: 14 }}>
              <ExternalLink href={service.legal.providerTermsUrl}>Provider Terms</ExternalLink>
              <ExternalLink href={service.legal.providerPrivacyUrl}>Provider Privacy</ExternalLink>
              <ExternalLink href={service.legal.marketplaceTermsUrl}>Daski Terms</ExternalLink>
              <ExternalLink href={service.legal.marketplacePrivacyUrl}>Daski Privacy</ExternalLink>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 22, height: 1, background: 'var(--pro-border)' }} />
        <div className="dk-stat-grid dk-collapse-4-to-2" style={{ marginTop: 18, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <ProviderStat label="Provider agent" value={`#${service.providerAgentId}`} />
          <ProviderStat label="Service version" value={service.serviceVersion} />
          <ProviderStat label="Lifecycle" value={service.serviceLifecycle} />
          <ProviderStat
            label="Card validated"
            value={service.freshness.lastValidatedAt
              ? new Date(service.freshness.lastValidatedAt).toLocaleString()
              : 'Not reported'}
          />
        </div>
      </div>
    </Section>
  );
}

function ProviderStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={smallLabelStyle}>{label}</span>
      <span style={providerValueStyle}>{value}</span>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noreferrer" className="dk-link-mint"><Icon name="external" size={13} />{children}</a>;
}

const providerTitleStyle = { fontSize: 22, fontWeight: 600, margin: '0 0 14px', color: 'var(--pro-text)', letterSpacing: '-0.015em' };
const linkRowStyle = { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 } as const;
const smallLabelStyle = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--pro-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.3 } as const;
const providerValueStyle = { fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--pro-text)', letterSpacing: '-0.01em', overflowWrap: 'anywhere' } as const;

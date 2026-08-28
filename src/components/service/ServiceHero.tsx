import { categoryFamilyConfig } from '../../config/service-taxonomy';
import {
  priceDisplay,
  serviceChips,
  type ServiceDetail,
} from '../../lib/api';
import { ServiceTaxonomyChips } from '../ServiceTaxonomyChips';
import { Icon } from '../ui/Icon';
import { Section } from '../ui/Section';

export function ServiceHero({ service }: { service: ServiceDetail }) {
  const family = categoryFamilyConfig(service.categoryFamily);
  const price = priceDisplay(service);
  const paidSkills = service.skills.filter((skill) => skill.paymentRequired);

  return (
    <>
      <Section pad="24px 32px 0">
        <div style={breadcrumbStyle}>
          <a href="/" style={breadcrumbLinkStyle}>services</a>
          <span>/</span><span style={{ color: 'var(--pro-text)' }}>{service.name}</span>
        </div>
      </Section>

      <Section pad="24px 32px 32px">
        <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(52,211,177,0.06)', border: `1px solid ${family.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: family.color }}>
          <Icon name={family.icon} size={26} />
        </div>
        <h1 className="dk-service-h1" style={titleStyle}>{service.name}</h1>
        <ServiceTaxonomyChips
          categoryFamily={service.categoryFamily}
          serviceType={service.serviceType}
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {serviceChips(service).map((chip) => <span key={chip} className="dk-skill-chip">{chip}</span>)}
        </div>
        <p style={descriptionStyle}>{service.serviceDescription}</p>
        <div style={statsFrameStyle}>
          <div className="dk-stat-grid dk-collapse-6-to-3" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            <StatCell label="Price" value={price.value} unit={price.unit} mint />
            <StatCell label="Skills" value={String(service.skills.length)} />
            <StatCell label="Paid skills" value={String(paidSkills.length)} />
            <StatCell label="Turnaround" value={service.turnaroundEstimate} />
            <StatCell label="Jurisdictions" value={service.jurisdictions.join(', ')} />
            <StatCell
              label="Availability"
              value={service.acceptingNewOrders ? 'Open' : 'Paused'}
            />
          </div>
        </div>
      </Section>
    </>
  );
}

function StatCell({ label, value, unit, mint }: {
  label: string;
  value: string;
  unit?: string | null;
  mint?: boolean;
}) {
  return (
    <div style={{ padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <span style={statLabelStyle}>{label}</span>
      <span style={{ ...statValueStyle, color: mint ? 'var(--mint-400)' : 'var(--pro-text)' }}>
        {value}
        {unit && <span style={unitStyle}>{unit}</span>}
      </span>
    </div>
  );
}

const breadcrumbStyle = { display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pro-text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' } as const;
const breadcrumbLinkStyle = { background: 'transparent', border: 'none', color: 'var(--pro-text-dim)', cursor: 'pointer', padding: 0, borderBottom: 'none', textDecoration: 'none' };
const titleStyle = { fontSize: 48, fontWeight: 700, margin: '20px 0 16px', color: 'var(--pro-text)', letterSpacing: '-0.03em', lineHeight: 1.05 };
const descriptionStyle = { color: 'var(--pro-text-dim)', fontSize: 17, lineHeight: 1.55, margin: 0, maxWidth: 760 };
const statsFrameStyle = { marginTop: 28, border: '1px solid var(--pro-border)', borderRadius: 14, overflow: 'hidden' };
const statLabelStyle = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--pro-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.3 } as const;
const statValueStyle = { fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2, overflowWrap: 'anywhere' } as const;
const unitStyle = { fontSize: 11, color: 'var(--pro-text-dim)', letterSpacing: '0.04em', marginLeft: 6 };

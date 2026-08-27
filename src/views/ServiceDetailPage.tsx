import { ProviderAndRailDetails } from '../components/service/ProviderAndRailDetails';
import { ServiceHero } from '../components/service/ServiceHero';
import { ServicePurchasesAndUsage } from '../components/service/ServicePurchasesAndUsage';
import { ServiceSkillsTable } from '../components/service/ServiceSkillsTable';
import type { ServiceDetail } from '../lib/api';

export function ServiceDetailPage({ service }: { service: ServiceDetail }) {
  return (
    <div style={{ background: 'var(--pro-bg)' }}>
      <ServiceHero service={service} />
      <ProviderAndRailDetails service={service} />
      <ServicePurchasesAndUsage service={service} />
      <ServiceSkillsTable service={service} />
    </div>
  );
}

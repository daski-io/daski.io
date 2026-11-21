import { AgentPromptSection } from '../components/AgentPromptSection';
import { ProviderAndRailDetails } from '../components/service/ProviderAndRailDetails';
import { ServiceHero } from '../components/service/ServiceHero';
import { ServicePurchasesAndUsage } from '../components/service/ServicePurchasesAndUsage';
import { ServiceSkillsTable } from '../components/service/ServiceSkillsTable';
import type { ServiceDetail } from '../lib/api';

export function ServiceDetailPage({ service, explorerUrl, gatewayUrl, siteUrl }: {
  service: ServiceDetail;
  explorerUrl: string;
  gatewayUrl: string | null;
  siteUrl: string;
}) {
  return (
    <div style={{ background: 'var(--pro-bg)' }}>
      <ServiceHero service={service} />
      <AgentPromptSection pad="0 32px 40px" gatewayUrl={gatewayUrl} siteUrl={siteUrl} serviceName={service.name} />
      <ProviderAndRailDetails service={service} explorerUrl={explorerUrl} />
      <ServicePurchasesAndUsage service={service} />
      <ServiceSkillsTable service={service} />
    </div>
  );
}

import { reputationRate, servicePath, type PublicService } from '../../lib/api';
import { atomicUsdc, formatDuration } from '../../lib/displayFormat';
import { Card } from '../ui/Card';
import { Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

interface ProviderGroup {
  agentId: string;
  name: string;
  services: PublicService[];
}

function groupProviders(services: PublicService[]): ProviderGroup[] {
  const groups = new Map<string, ProviderGroup>();
  for (const service of services) {
    const current = groups.get(service.agentId);
    if (current) current.services.push(service);
    else groups.set(service.agentId, {
      agentId: service.agentId,
      name: service.providerName ?? `Provider ${service.agentId}`,
      services: [service],
    });
  }
  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function ProviderDirectory({
  services,
  registryAvailable,
}: {
  services: PublicService[];
  registryAvailable: boolean;
}) {
  const providers = groupProviders(services);
  return (
    <Section pad="48px 32px 0">
      <SectionHead
        kicker="admitted providers"
        title="Live on the standard rail."
        subtitle="Only providers present in the gateway's validated outcome registry appear here."
        action={<Mono dim>{providers.length} providers</Mono>}
      />
      {!registryAvailable ? (
        <Card padding={22}>
          <p style={{ color: 'var(--pro-text-dim)', margin: 0 }}>
            The verified provider registry is unavailable. No cached or unverified listings are shown.
          </p>
        </Card>
      ) : providers.length === 0 ? (
        <Card padding={22}>
          <p style={{ color: 'var(--pro-text-dim)', margin: 0 }}>No providers are currently admitted.</p>
        </Card>
      ) : (
        <div className="dk-grid-3">
          {providers.map((provider) => {
            const reputation = provider.services[0]!.standardRail.providerReputation;
            return (
              <Card key={provider.agentId} padding={22}>
                <Mono mint>{provider.agentId}</Mono>
                <h3 style={{ color: 'var(--pro-text)', margin: '10px 0 12px' }}>{provider.name}</h3>
                <p style={{ color: 'var(--pro-text-dim)', fontSize: 13 }}>
                  {reputation.transactionCount} purchases · {atomicUsdc(reputation.totalPaid)} USDC sales<br />
                  {reputationRate(reputation.completionRate)} completion ({reputation.completionSampleSize}) ·{' '}
                  {reputation.averageFulfillmentSeconds === null
                    ? 'no fulfillment timing'
                    : `${formatDuration(reputation.averageFulfillmentSeconds)} avg fulfillment`}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {provider.services.map((service) => (
                    <a key={service.serviceSlug} href={servicePath(service)}>{service.name}</a>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Section>
  );
}

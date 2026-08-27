import {
  atomicUsdc,
  reputationRate,
  reputationRates,
  type ReputationStats,
  type ServiceDetail,
} from '../../lib/api';
import { Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

export function ServicePurchasesAndUsage({ service }: { service: ServiceDetail }) {
  const rows = [
    service.serviceReputation
      ? { label: 'This service', stats: service.serviceReputation }
      : null,
    service.providerReputation
      ? { label: 'Provider, all services', stats: service.providerReputation }
      : null,
  ].filter((row): row is { label: string; stats: ReputationStats } => row !== null);
  return (
    <Section pad="40px 32px 0">
      <SectionHead kicker="on-chain track record" title={null} />
      {rows.length === 0 ? <EmptyReputation /> : (
        <div style={{ display: 'grid', gap: 16 }}>
          {rows.map((row) => (
            <ReputationRow key={row.label} label={row.label} stats={row.stats} />
          ))}
          <Mono dim style={{ fontSize: 11 }}>
            Aggregates read from on-chain reputation storage at safe block {rows[0]!.stats.safeBlock}.
          </Mono>
        </div>
      )}
    </Section>
  );
}

function ReputationRow({ label, stats }: { label: string; stats: ReputationStats }) {
  const rates = reputationRates(stats);
  const tiles = [
    { label: 'Purchases', value: String(rates.purchases) },
    { label: 'Completed', value: stats.completed },
    { label: 'Completion rate', value: reputationRate(rates.completionRate) },
    { label: 'Buyer satisfaction', value: reputationRate(rates.buyerSatisfaction) },
    ...(stats.refundedAmount !== null
      ? [{ label: 'Refunded', value: `${atomicUsdc(stats.refundedAmount)} USDC` }]
      : []),
  ];
  return (
    <div style={{ border: '1px solid var(--pro-border)', borderRadius: 12, background: 'var(--pro-surface)', padding: '20px 24px' }}>
      <Mono dim style={{ display: 'block', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        {label}
      </Mono>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
        {tiles.map((tile) => (
          <div key={tile.label}>
            <div style={{ color: 'var(--pro-text)', fontSize: 20, fontWeight: 600 }}>{tile.value}</div>
            <div style={{ color: 'var(--pro-text-dim)', fontSize: 12 }}>{tile.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyReputation() {
  return (
    <div style={{ border: '1px solid var(--pro-border)', borderRadius: 12, background: 'var(--pro-surface)', padding: 28, textAlign: 'center', color: 'var(--pro-text-dim)', fontSize: 14, lineHeight: 1.6 }}>
      <Mono dim style={{ display: 'block', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>reputation unavailable</Mono>
      On-chain reputation aggregates will appear here once reads succeed.
    </div>
  );
}

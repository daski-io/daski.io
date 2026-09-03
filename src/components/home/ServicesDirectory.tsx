import { useMemo, useState } from 'react';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';
import { Mono } from '../ui/Mono';
import { Icon } from '../ui/Icon';
import { Card } from '../ui/Card';
import { ServiceTaxonomyChips } from '../ServiceTaxonomyChips';
import {
  priceRange,
  serviceChips,
  serviceKey,
  servicePath,
  type ServiceCardData,
} from '../../lib/api';
import {
  categoryFamilyConfig,
  filterServicesByCategory,
  populatedCategoryFamilies,
  type CategoryFamily,
  type CategoryFamilyFilter,
} from '../../config/service-taxonomy';

interface ServicesDirectoryProps {
  services: ServiceCardData[];
  loading?: boolean;
  error?: string | null;
}

export function ServicesDirectory({ services, loading, error }: ServicesDirectoryProps) {
  const [filter, setFilter] = useState<CategoryFamilyFilter>('all');
  const families = useMemo(() => populatedCategoryFamilies(services), [services]);
  const filters = useMemo(
    () => [
      { slug: 'all' as const, label: 'All', count: services.length },
      ...families,
    ],
    [families, services.length],
  );

  const filtered = useMemo(
    () => filterServicesByCategory(services, filter),
    [services, filter],
  );

  return (
    <Section pad="24px 32px 16px" style={{ position: 'relative' }}>
      <span id="directory" style={{ position: 'absolute', top: -80 }} />
      <SectionHead
        kicker="live services"
        title="Base Sepolia testnet. The protocol is real. The money isn't, yet."
        action={<Mono dim>{filtered.length} live</Mono>}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 22,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.map((category) => {
            const active = filter === category.slug;
            return (
              <button
                key={category.slug}
                onClick={() => setFilter(category.slug)}
                style={{
                  padding: '0 12px',
                  height: 30,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: active ? 'var(--mint-400)' : 'transparent',
                  color: active ? '#04221b' : 'var(--pro-text-dim)',
                  border: '1px solid ' + (active ? 'var(--mint-400)' : 'var(--pro-border)'),
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 180ms var(--ease)',
                }}
              >
                {category.label}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: active ? '#04221b' : 'var(--pro-text-dim)',
                    opacity: 0.7,
                  }}
                >
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dk-grid-3">
        {loading && services.length === 0 && <ServiceCardSkeleton />}
        {error && (
          <div
            className="dk-card"
            style={{
              padding: 22,
              gridColumn: '1 / -1',
              color: 'var(--pro-text-dim)',
              fontSize: 13,
            }}
          >
            Couldn't load services from the gateway: {error}
          </div>
        )}
        {filtered.map((s) => (
          // The gateway-issued canonical service id is the catalog identity.
          <ServiceCard key={serviceKey(s)} service={s} />
        ))}
      </div>
    </Section>
  );
}

// Renders a category-family glyph for the service. Provider brand marks
// return once the v3 catalog exposes a validated iconUrl.
function ServiceIcon({ categoryFamily }: { categoryFamily: CategoryFamily }) {
  const family = categoryFamilyConfig(categoryFamily);
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: 'rgba(52,211,177,0.06)',
        border: `1px solid ${family.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: family.color,
      }}
    >
      <Icon name={family.icon} size={20} />
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceCardData }) {
  const chips = serviceChips(service);

  return (
    <Card
      hoverable
      padding={0}
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Flex column with the content block flexing: grid rows stretch
          cards to equal height, and this pins the price/provider bars to
          the bottom even when one card's content is shorter. */}
      <a
        href={servicePath(service)}
        style={{
          borderBottom: 'none',
          color: 'inherit',
          textDecoration: 'none',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div style={{ padding: '22px 22px 16px', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 18,
              gap: 12,
            }}
          >
            <ServiceIcon categoryFamily={service.categoryFamily} />
          </div>
          <h3
            style={{
              fontSize: 22,
              color: 'var(--pro-text)',
              margin: '0 0 12px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            {service.name}
          </h3>
          <ServiceTaxonomyChips
            categoryFamily={service.categoryFamily}
            serviceType={service.serviceType}
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            {chips.map((c) => (
              <span
                key={c}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--pro-surface2)',
                  color: 'var(--pro-text-dim)',
                  border: '1px solid var(--pro-border)',
                  letterSpacing: '0.02em',
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--pro-border)',
            background: 'var(--pro-bg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div>
            <Mono mint style={{ fontSize: 14, fontWeight: 600 }}>
              {priceRange(service)}
            </Mono>
            <Mono dim style={{ display: 'block', fontSize: 11, marginTop: 2, letterSpacing: '0.04em' }}>
              price
            </Mono>
          </div>
          <div
            title={service.turnaroundEstimate}
            style={{ textAlign: 'right', minWidth: 0 }}
          >
            <Mono
              style={{
                display: 'block',
                maxWidth: '25ch',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 12,
              }}
            >
              {service.turnaroundEstimate}
            </Mono>
            <Mono dim style={{ display: 'block', fontSize: 11, marginTop: 2, letterSpacing: '0.04em' }}>
              turnaround
            </Mono>
          </div>
        </div>
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--pro-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--pro-text-dim)' }}>by</span>
              <span
                style={{
                  color: 'var(--pro-text)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {service.providerName}
              </span>
              <Icon name="check" size={12} color="var(--mint-400)" strokeWidth={2.6} />
            </div>
            <Mono dim style={{ fontSize: 11, letterSpacing: '0.02em' }}>
              {service.skills.length} skill{service.skills.length === 1 ? '' : 's'} ·{' '}
              {service.skills.filter((s) => s.paymentRequired).length} paid
            </Mono>
          </div>
          <span
            style={{
              color: 'var(--mint-400)',
              fontSize: 12,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              borderBottom: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            View <Icon name="arrow" size={12} />
          </span>
        </div>
      </a>
    </Card>
  );
}

function ServiceCardSkeleton() {
  return (
    <div
      className="dk-card"
      style={{
        padding: 22,
        minHeight: 240,
        background: 'var(--pro-surface)',
        color: 'var(--pro-text-dim)',
        fontSize: 13,
      }}
    >
      <div className="dot-grid" style={{ height: 44, opacity: 0.3 }} />
      <Mono dim style={{ marginTop: 18, display: 'block' }}>loading services…</Mono>
    </div>
  );
}

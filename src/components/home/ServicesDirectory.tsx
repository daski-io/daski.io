import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';
import { Mono } from '../ui/Mono';
import { Pill } from '../ui/Pill';
import { Icon } from '../ui/Icon';
import { Card } from '../ui/Card';
import {
  categoryToIcon,
  priceRange,
  serviceChips,
  type PublicService,
} from '../../lib/api';

interface ServicesDirectoryProps {
  services: PublicService[];
  loading?: boolean;
  error?: string | null;
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'domains', label: 'Domains' },
  { id: 'hosting', label: 'Hosting' },
  { id: 'legal', label: 'Legal' },
  { id: 'email', label: 'Email' },
  { id: 'compute', label: 'Compute' },
];

export function ServicesDirectory({ services, loading, error }: ServicesDirectoryProps) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('reputation');

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: services.length };
    for (const c of CATEGORIES) {
      if (c.id === 'all') continue;
      out[c.id] = services.filter((s) => categoryToIcon(s.category).cat === c.id).length;
    }
    return out;
  }, [services]);

  const filtered = useMemo(() => {
    let list = services.filter(
      (s) => filter === 'all' || categoryToIcon(s.category).cat === filter,
    );
    if (sort === 'price-low') {
      list = [...list].sort((a, b) => {
        const ap = Number(a.pricing.basePrice ?? 0);
        const bp = Number(b.pricing.basePrice ?? 0);
        return ap - bp;
      });
    }
    return list;
  }, [services, filter, sort]);

  return (
    <Section pad="24px 32px 16px" style={{ position: 'relative' }}>
      <span id="directory" style={{ position: 'absolute', top: -80 }} />
      <SectionHead
        kicker="live services"
        title="Real services your agent can buy right now."
        subtitle="One real service for now. New services coming."
        action={<Mono dim>{filtered.length} live</Mono>}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 22,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => {
            const active = filter === c.id;
            const has = (counts[c.id] ?? 0) > 0;
            return (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                style={{
                  padding: '0 12px',
                  height: 30,
                  borderRadius: 8,
                  cursor: has || c.id === 'all' ? 'pointer' : 'default',
                  background: active ? 'var(--mint-400)' : 'transparent',
                  color: active ? '#04221b' : has ? 'var(--pro-text-dim)' : 'var(--pro-border-hi)',
                  border: '1px solid ' + (active ? 'var(--mint-400)' : 'var(--pro-border)'),
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: has || c.id === 'all' ? 1 : 0.5,
                  transition: 'all 180ms var(--ease)',
                }}
              >
                {c.label}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: active ? '#04221b' : 'var(--pro-text-dim)',
                    opacity: 0.7,
                  }}
                >
                  {counts[c.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <SortDropdown value={sort} onChange={setSort} />
      </div>

      <div
        className="grid-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
      >
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
          <ServiceCard key={s.agentId} service={s} />
        ))}
        <BecomeProviderCard />
      </div>
    </Section>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const opts = [
    { id: 'reputation', label: 'Reputation' },
    { id: 'recent', label: 'Recent' },
    { id: 'price-low', label: 'Price · low to high' },
  ];
  const current = opts.find((o) => o.id === value) ?? opts[0];
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          height: 30,
          padding: '0 12px',
          borderRadius: 8,
          cursor: 'pointer',
          background: 'transparent',
          border: '1px solid var(--pro-border)',
          color: 'var(--pro-text)',
          fontSize: 13,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            color: 'var(--pro-text-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          sort
        </span>
        {current.label}
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 36,
            minWidth: 200,
            background: 'var(--pro-surface)',
            border: '1px solid var(--pro-border)',
            borderRadius: 8,
            padding: 4,
            zIndex: 5,
            boxShadow: 'var(--shadow-3)',
          }}
        >
          {opts.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 6,
                background: o.id === value ? 'var(--pro-surface2)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--pro-text)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {o.label}
              {o.id === value && (
                <Icon name="check" size={13} color="var(--mint-400)" strokeWidth={2.4} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceIcon({ category }: { category: string | null }) {
  const m = categoryToIcon(category);
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: 'rgba(52,211,177,0.06)',
        border: `1px solid ${m.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: m.color,
      }}
    >
      <Icon name={m.name} size={20} />
    </div>
  );
}

function ServiceCard({ service }: { service: PublicService }) {
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
      <Link to={`/service/${service.agentId}`} style={{ borderBottom: 'none', color: 'inherit' }}>
        <div style={{ padding: '22px 22px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 18,
              gap: 12,
            }}
          >
            <ServiceIcon category={service.category} />
            <Pill tone="success" pulse>
              live
            </Pill>
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
              price range
            </Mono>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Mono style={{ fontSize: 14 }}>~{service.turnaroundEstimate ?? '-'}</Mono>
            <Mono dim style={{ display: 'block', fontSize: 11, marginTop: 2, letterSpacing: '0.04em' }}>
              avg completion
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
              <span style={{ color: 'var(--pro-text)', fontWeight: 500 }}>
                {providerNameFromUri(service.agentURI) ?? 'Provider'}
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
      </Link>
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

function BecomeProviderCard() {
  return (
    <Link
      to="/providers"
      className="dk-card hoverable"
      style={{
        borderStyle: 'dashed',
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textDecoration: 'none',
        color: 'var(--pro-text)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 240,
        borderBottom: 'none',
      }}
    >
      <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'transparent',
            border: '1px dashed var(--pro-border-hi)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--pro-text-dim)',
            marginBottom: 18,
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, lineHeight: 1 }}>+</span>
        </div>
        <h3
          style={{
            fontSize: 22,
            color: 'var(--pro-text)',
            margin: '0 0 10px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          Become a Provider
        </h3>
        <p
          style={{
            color: 'var(--pro-text-dim)',
            fontSize: 13.5,
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 280,
          }}
        >
          Add your service to Daski. Reach AI agents the moment they need what you offer.
        </p>
      </div>
      <div style={{ position: 'relative', marginTop: 18 }}>
        <span
          style={{
            color: 'var(--mint-400)',
            fontSize: 13,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          See what's required <Icon name="arrow" size={13} />
        </span>
      </div>
    </Link>
  );
}

function providerNameFromUri(uri: string): string | null {
  try {
    const u = new URL(uri);
    const host = u.hostname;
    // Strip leading 'sandbox-provider.' / 'www.' / etc.
    const base = host.replace(/^sandbox-provider\./, '').replace(/^www\./, '');
    // Strip TLD for a friendlier label
    const label = base.split('.')[0];
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return null;
  }
}

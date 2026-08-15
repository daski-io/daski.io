import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption, Mono } from '../components/ui/Mono';
import { Icon, type IconName } from '../components/ui/Icon';
import { Card } from '../components/ui/Card';
import { ProviderDirectory } from '../components/providers/ProviderDirectory';
import type { PublicService } from '../lib/api';

export function ProvidersPage({
  services,
  registryAvailable,
}: {
  services: PublicService[];
  registryAvailable: boolean;
}) {
  return (
    <div>
      <Section pad="88px 32px 48px">
        <div style={{ maxWidth: 880 }}>
          <Caption style={{ marginBottom: 18 }}>for service providers</Caption>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: 'var(--pro-text)',
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
              margin: 0,
            }}
          >
            AI agents are starting to buy real services.{' '}
            <span style={{ color: 'var(--mint-400)' }}>List once, get paid by any of them.</span>
          </h1>
          <p
            style={{
              color: 'var(--pro-text-dim)',
              fontSize: 17,
              lineHeight: 1.6,
              margin: '22px 0 0',
              maxWidth: 700,
            }}
          >
            AI agents are starting to buy real services. They book flights through APIs, register
            domains, deploy hosting, and increasingly handle the operational footprint of real
            businesses on their own. Daski is the layer where they discover and pay your service in
            USDC, with no negotiated integration.
          </p>
        </div>
      </Section>

      <Section pad="32px 32px 0">
        <SectionHead kicker="what you need" title="Three things." />
        <div className="dk-grid-3">
          <NeedCard
            n="01"
            title="An A2A endpoint"
            body="A signed dispatch endpoint plus payer-authorized lifecycle, quote, reserve, and refund endpoints. Daski sends independently verified chain evidence before fulfillment."
            icon="plug"
          />
          <NeedCard
            n="02"
            title="A wallet for USDC"
            body="A provider payee plus a separate refund-reserve wallet on Base. Immutable splitters release each payment directly."
            icon="wallet"
          />
          <NeedCard
            n="03"
            title="Pricing for your skills"
            body="A fixed USDC price or signed dynamic quote, plus signed schemas, terms, capacity, deadlines, refund policy, and key roles."
            icon="dollar"
          />
        </div>
      </Section>

      <Section pad="48px 32px 0">
        <SectionHead kicker="four steps" title="How it works." />
        <div
          style={{
            border: '1px solid var(--pro-border)',
            borderRadius: 14,
            background: 'var(--pro-surface)',
            overflow: 'hidden',
          }}
        >
          {[
            {
              n: 1,
              t: 'Implement the provider control plane',
              sub:
                'Expose signed quote, reserve, dispatch, lifecycle, and refund endpoints with one-attempt replay protection.',
            },
            {
              n: 2,
              t: 'Deploy the outcome splitter',
              sub:
                'Deploy and verify one immutable splitter per listing epoch. Its bytecode and immutable provider, commission receiver, token, and fee bindings become part of the signed listing manifest.',
            },
            {
              n: 3,
              t: 'Sign the listing artifacts',
              sub:
                'Publish the listing commitment, offer, schemas, legal terms, deadline policy, capacity limit, and provider control profile.',
            },
            {
              n: 4,
              t: 'Receive USDC settlements',
              sub:
                'A standard x402 facilitator submits the buyer’s EIP-3009 authorization to the outcome splitter; release pays your wallet and Daski directly.',
            },
          ].map((s, i, arr) => (
            <div
              key={s.n}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 220px 1fr',
                padding: '20px 24px',
                gap: 24,
                alignItems: 'center',
                borderBottom: i < arr.length - 1 ? '1px solid var(--pro-border)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 26,
                  color: 'var(--mint-400)',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                }}
              >
                {String(s.n).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 16, color: 'var(--pro-text)', fontWeight: 600 }}>{s.t}</div>
              <div style={{ fontSize: 14, color: 'var(--pro-text-dim)', lineHeight: 1.55 }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section pad="48px 32px 0">
        <SectionHead
          kicker="public operating record"
          title="Every sale can strengthen the listing you control."
          subtitle="Daski publishes finalized provider, service, and outcome aggregates with explicit sample sizes—never private payer identity or raw asset data."
        />
        <div className="dk-grid-3">
          <NeedCard n="01" title="All-time volume" body="Finalized USDC sales and refunds are shown at provider, service, and outcome scope." icon="wallet" />
          <NeedCard n="02" title="Delivery record" body="Completed, failed, and canceled standard orders feed a transparent completion sample." icon="check" />
          <NeedCard n="03" title="Buyer signal" body="Wallet-signed confirmations are revision-aware, revocable, and displayed only with their sample size." icon="user" />
        </div>
      </Section>

      <ProviderDirectory services={services} registryAvailable={registryAvailable} />

    </div>
  );
}

function NeedCard({
  n,
  title,
  body,
  icon,
}: {
  n: string;
  title: string;
  body: string;
  icon: IconName;
}) {
  return (
    <Card padding={22}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Mono mint style={{ fontSize: 13 }}>
          {n}
        </Mono>
        <Icon name={icon} size={16} color="var(--mint-400)" />
      </div>
      <div
        style={{
          fontSize: 17,
          color: 'var(--pro-text)',
          fontWeight: 600,
          marginBottom: 8,
          letterSpacing: '-0.015em',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--pro-text-dim)', lineHeight: 1.55 }}>{body}</div>
    </Card>
  );
}

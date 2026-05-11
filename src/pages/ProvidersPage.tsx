import type { ReactNode } from 'react';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption, Mono } from '../components/ui/Mono';
import { Icon, type IconName } from '../components/ui/Icon';
import { Card } from '../components/ui/Card';

export function ProvidersPage() {
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
        <div
          className="grid-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
        >
          <NeedCard
            n="01"
            title="An A2A endpoint"
            body="Standard Agent2Agent protocol with the daski-marketplace extension. We have reference implementations in TypeScript and Python."
            icon="plug"
          />
          <NeedCard
            n="02"
            title="A wallet for USDC"
            body="Any EOA on Base. Settlement deposits land directly. Daski never custodies funds."
            icon="wallet"
          />
          <NeedCard
            n="03"
            title="Pricing for your skills"
            body="A flat USDC price per skill, or a price function. You sign Agent Cards declaring what you offer."
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
              t: 'Implement A2A',
              sub:
                'POST /a2a/{your-id} with task lifecycle (WORKING → INPUT-REQUIRED → COMPLETED)',
            },
            {
              n: 2,
              t: 'Register on-chain',
              sub:
                'Two short txs: mint your ERC-8004 agent in ProviderRegistry (a small one-time USDC listing fee to the protocol treasury), then add each offering to ServiceRegistry.',
            },
            {
              n: 3,
              t: 'Sign Agent Cards',
              sub:
                'List your skills, prices, schemas. Cards are signed by your wallet and posted off-chain; each skill rolls up to one of your on-chain services.',
            },
            {
              n: 4,
              t: 'Receive USDC settlements',
              sub:
                'PaymentRouter validates the (provider, service) pair on every settle and splits the principal between your wallet and the protocol fee in the same tx.',
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

      <Section pad="64px 32px 0">
        <SectionHead
          kicker="reach out"
          title="Building a service that agents could buy?"
          subtitle="Tell us what it does and we'll help you list. Intentionally not self-serve: every early provider needs a real conversation."
        />
        <a
          href="https://x.com/pmmmm"
          target="_blank"
          rel="noreferrer"
          className="dk-card hoverable"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '22px 26px',
            borderBottom: 'none',
            color: 'var(--pro-text)',
            textDecoration: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'rgba(52,211,177,0.08)',
                border: '1px solid var(--mint-700)',
                color: 'var(--mint-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="twitter" size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--pro-text)', marginBottom: 4 }}
              >
                DM on X
              </div>
              <Mono dim style={{ fontSize: 13 }}>
                @pmmmm
              </Mono>
            </div>
          </div>
          <span
            style={{
              color: 'var(--mint-400)',
              fontSize: 13,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            Open X <Icon name="external" size={13} />
          </span>
        </a>
      </Section>
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

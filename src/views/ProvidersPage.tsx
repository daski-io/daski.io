import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption, Mono } from '../components/ui/Mono';
import { Icon, type IconName } from '../components/ui/Icon';
import { IconTile } from '../components/ui/IconTile';
import { CopyButton } from '../components/ui/CopyButton';

type PlatformId = 'claude' | 'codex' | 'byo';

interface Platform {
  id: PlatformId;
  name: string;
  sub: string;
  icon: IconName;
  cmdLabel: string;
  cmd: string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    sub: "Anthropic's coding agent.",
    icon: 'claude',
    cmdLabel: 'one-line install',
    cmd: 'npx skills add https://github.com/daski-io/provider --skill daski-provider -a claude-code',
  },
  {
    id: 'codex',
    name: 'Codex',
    sub: "OpenAI's coding agent.",
    icon: 'openai',
    cmdLabel: 'one-line install',
    cmd: 'npx skills add https://github.com/daski-io/provider --skill daski-provider -a codex',
  },
  {
    id: 'byo',
    name: 'Bring your own',
    sub: 'Cursor · Gemini CLI · any SKILL.md harness.',
    icon: 'plug',
    cmdLabel: 'installs for every detected agent',
    cmd: 'npx skills add https://github.com/daski-io/provider --skill daski-provider',
  },
];

export function ProvidersPage() {
  return (
    <div>
      <Section pad="88px 32px 48px">
        <div style={{ maxWidth: 880 }}>
          <Caption style={{ marginBottom: 18 }}>for service providers</Caption>
          <h1
            className="dk-page-h1"
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: 'var(--pro-text)',
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
              margin: 0,
            }}
          >
            AI agents are buying real services.{' '}
            <span style={{ color: 'var(--mint-400)' }}>Sell yours.</span>
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
            They already form companies, register domains, and deploy hosting through APIs. Daski
            is where they discover your service and pay you in USDC on Base. Don&apos;t get left
            behind.
          </p>
        </div>
      </Section>

      <Section pad="48px 32px 0">
        <SectionHead
          kicker="integrate · use agent skill"
          title="Let your coding agent do the integration."
          subtitle="Give your favorite coding agent the skill to add your services to daski."
        />
        <ProviderSkillPicker />
      </Section>

      <Section pad="64px 32px 0">
        <div className="dk-grid-2">
          <ProviderCta icon="github" title="Start from the template">
            <p style={ctaBodyStyle}>
              Still hand-coding? Checkout this MIT-licensed template repo for all integration
              details.
            </p>
            <ProviderLink href="https://github.com/daski-io/provider">
              github.com/daski-io/provider
            </ProviderLink>
          </ProviderCta>

          <ProviderCta icon="chat" title="Talk to Daski">
            <p style={ctaBodyStyle}>
              Deploy and test on Testnet. When ready to launch live reach out so we can review and
              whitelist you.
            </p>
            <ProviderLink href="https://discord.gg/uyeMp7Q2HW">
              Join the Daski Discord
            </ProviderLink>
          </ProviderCta>
        </div>
      </Section>
    </div>
  );
}

function ProviderSkillPicker() {
  const [active, setActive] = useState<PlatformId>('claude');
  const platform = PLATFORMS.find((candidate) => candidate.id === active) ?? PLATFORMS[0];

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + offset + PLATFORMS.length) % PLATFORMS.length;
    const next = PLATFORMS[nextIndex];
    setActive(next.id);
    document.getElementById(`provider-tab-${next.id}`)?.focus();
  };

  return (
    <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        role="tablist"
        aria-label="Coding agent"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--pro-border)',
          background: 'var(--pro-bg)',
        }}
      >
        {PLATFORMS.map((candidate, index) => {
          const isActive = candidate.id === active;

          return (
            <button
              id={`provider-tab-${candidate.id}`}
              key={candidate.id}
              type="button"
              role="tab"
              aria-controls="provider-skill-panel"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(candidate.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '15px 16px',
                background: isActive ? 'var(--pro-surface)' : 'transparent',
                border: 'none',
                borderRight:
                  index < PLATFORMS.length - 1 ? '1px solid var(--pro-border)' : 'none',
                borderBottom: `2px solid ${isActive ? 'var(--mint-400)' : 'transparent'}`,
                marginBottom: -1,
                color: isActive ? 'var(--pro-text)' : 'var(--pro-text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                transition: 'color 180ms var(--ease), background 180ms var(--ease)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <Icon
                name={candidate.icon}
                size={15}
                color={isActive ? 'var(--mint-400)' : 'var(--pro-text-dim)'}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{candidate.name}</span>
            </button>
          );
        })}
      </div>

      <div
        id="provider-skill-panel"
        role="tabpanel"
        aria-labelledby={`provider-tab-${platform.id}`}
        className="fadein"
        key={platform.id}
        style={{ padding: '26px 28px 28px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
          <IconTile name={platform.icon} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 19,
                fontWeight: 600,
                color: 'var(--pro-text)',
                letterSpacing: '-0.015em',
                marginBottom: 4,
              }}
            >
              {platform.name}
            </div>
            <div style={{ fontSize: 14, color: 'var(--pro-text-dim)' }}>{platform.sub}</div>
          </div>
          <Mono
            dim
            style={{
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              paddingTop: 6,
            }}
          >
            ~30s
          </Mono>
        </div>

        <div
          style={{
            background: '#06070b',
            border: '1px solid var(--pro-border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--pro-border)',
              background: 'linear-gradient(#0c0d13, #08090f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Mono dim style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {platform.cmdLabel}
            </Mono>
            <CopyButton text={platform.cmd} label="Copy" size="sm" />
          </div>
          <div
            style={{
              padding: '18px 20px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13.5,
              lineHeight: 1.65,
              color: '#cfcfdb',
              wordBreak: 'break-all',
            }}
          >
            <span style={{ color: 'var(--pro-text-dim)' }}>$ </span>
            {platform.cmd}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderCta({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="dk-card" style={{ padding: 22, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <IconTile name={icon} size="lg" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--pro-text)', marginBottom: 8 }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function ProviderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        color: 'var(--mint-400)',
        fontSize: 13,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderBottom: 'none',
      }}
    >
      {children}
      <Icon name="arrow" size={13} />
    </a>
  );
}

const ctaBodyStyle = {
  color: 'var(--pro-text-dim)',
  fontSize: 14,
  lineHeight: 1.6,
  margin: '0 0 12px',
};

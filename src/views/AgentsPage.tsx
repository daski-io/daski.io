import type { ReactNode } from 'react';
import { Section } from '../components/ui/Section';
import { SectionHead } from '../components/ui/SectionHead';
import { Caption } from '../components/ui/Mono';
import { type IconName } from '../components/ui/Icon';
import { IconTile } from '../components/ui/IconTile';
import { CodeBlock } from '../components/ui/CodeBlock';
import { PlatformPicker } from '../components/PlatformPicker';

const PROMPT = `Use the Daski MCP server at https://sandbox-gateway.daski.io/mcp\nto [your task here].`;

export function AgentsPage() {
  return (
    <div>
      <Section pad="88px 32px 48px">
        <div style={{ maxWidth: 880 }}>
          <Caption style={{ marginBottom: 18 }}>for ai agents · fast handoff</Caption>
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
            Empower your agent to <span style={{ color: 'var(--mint-400)' }}>buy real services.</span>
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
            Daski plugs into any AI agent that supports MCP. Connect a wallet, install the server,
            and your agent can discover and pay for services on Base.
          </p>

          <div
            style={{
              marginTop: 28,
              maxWidth: 720,
              padding: '20px 24px',
              borderRadius: 12,
              background: 'var(--pro-surface)',
              border: '1px solid var(--pro-border)',
            }}
          >
            <Caption style={{ marginBottom: 12 }}>your agent needs</Caption>
            <ol
              style={{
                margin: 0,
                paddingLeft: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                color: 'var(--pro-text)',
                fontSize: 14.5,
                lineHeight: 1.55,
              }}
            >
              <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <NumberChip>1</NumberChip>
                <span>
                  An MCP-compatible runtime
                  <span style={{ color: 'var(--pro-text-dim)' }}>
                    : Claude Code, OpenAI Codex, or any MCP client.
                  </span>
                </span>
              </li>
              <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <NumberChip>2</NumberChip>
                <span>
                  A wallet that holds USDC on Base.{' '}
                  <a
                    href="https://docs.cdp.coinbase.com/agentic-wallet/welcome"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--mint-400)', borderBottom: 'none' }}
                  >
                    Coinbase Agentic Wallet
                  </a>
                  <span style={{ color: 'var(--pro-text-dim)' }}> recommended.</span>
                </span>
              </li>
            </ol>
          </div>
        </div>
      </Section>

      <Section pad="48px 32px 0">
        <SectionHead
          kicker="install · 30 seconds"
          title="Pick your stack."
          subtitle="One install command. Daski's four tools auto-discover through MCP."
        />
        <PlatformPicker />
      </Section>

      <Section pad="64px 32px 0">
        <SectionHead kicker="wallet · usdc on base" title="Your agent needs USDC to pay." />
        <div className="dk-grid-2">
          <WalletStep n="01" title="Set up a wallet" icon="wallet">
            <a
              href="https://docs.cdp.coinbase.com/agentic-wallet/welcome"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--mint-400)', borderBottom: 'none' }}
            >
              Coinbase Agentic Wallet
            </a>{' '}
            is built for autonomous agents and integrates cleanly with Daski. Any EOA on Base works
            too.
          </WalletStep>
          <WalletStep n="02" title="Fund it with testnet USDC" icon="dollar">
            Sandbox runs on Base Sepolia. Get USDC from{' '}
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--mint-400)', borderBottom: 'none' }}
            >
              Circle's faucet
            </a>{' '}
            (~100 USDC per address per day). Your agent uses this to pay for services.
          </WalletStep>
        </div>
      </Section>

      <Section pad="64px 32px 0">
        <SectionHead
          kicker="copy-paste prompt"
          title="Hand it to your agent."
          subtitle="Paste this into Claude or ChatGPT. The agent self-onboards through the MCP server."
        />
        <CodeBlock copy={PROMPT} copyLabel="Copy prompt" size="lg">
          {PROMPT}
        </CodeBlock>
      </Section>
    </div>
  );
}

function NumberChip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--mint-400)',
        background: 'rgba(52,211,177,0.08)',
        border: '1px solid var(--mint-700)',
        borderRadius: 6,
        padding: '2px 7px',
        minWidth: 22,
        textAlign: 'center',
      }}
    >
      {children}
    </span>
  );
}

function WalletStep({
  n,
  title,
  icon,
  children,
}: {
  n: string;
  title: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <div className="dk-card" style={{ padding: 22, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <IconTile name={icon} size="lg" />
      <div style={{ minWidth: 0 }}>
        <Caption style={{ marginBottom: 6 }}>{`step ${n}`}</Caption>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--pro-text)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ color: 'var(--pro-text-dim)', fontSize: 14, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

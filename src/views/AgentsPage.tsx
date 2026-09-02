import type { ReactNode } from 'react';
import { AgentPromptSection } from '../components/AgentPromptSection';
import { Section } from '../components/ui/Section';
import { Caption } from '../components/ui/Mono';

export function AgentsPage() {
  return (
    <div>
      <Section pad="88px 32px 48px">
        <div style={{ maxWidth: 880 }}>
          <Caption style={{ marginBottom: 18 }}>for ai agents · fast handoff</Caption>
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
            Daski plugs into any AI agent that supports MCP. Connect a wallet, install the MCP
            server, and your agent can discover and pay for services with USDC on Base.
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
                  Use any EVM-compatible wallet.
                  <span style={{ color: 'var(--pro-text-dim)' }}> Your agent can set it up for you.</span>
                </span>
              </li>
            </ol>
          </div>
        </div>
      </Section>

      <AgentPromptSection pad="48px 32px 0" />
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

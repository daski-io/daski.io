import { useState } from 'react';
import {
  atomicUsdc,
  basescanTx,
  buyerDisplay,
  type ServiceDetail,
} from '../../lib/api';
import { relativeTime } from '../../lib/marketplacePresentation';
import { Icon } from '../ui/Icon';
import { Caption, Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

export function ServicePurchasesAndUsage({ service }: { service: ServiceDetail }) {
  const purchases = service.standardRail.reputation.recentPurchases;
  return (
    <>
      <Section pad="40px 32px 0">
        <SectionHead
          kicker="recent purchases of this service"
          title={null}
        />
        {purchases.length === 0 ? <EmptyPurchases /> : (
          <div className="dk-table" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <div className="dk-table-head dk-recent-row">
              <span>Agent</span><span>Paid</span><span>Skill</span><span>When</span><span>Receipt</span>
            </div>
            {purchases.map((purchase, index) => (
              <div
                key={purchase.orderKey}
                className="dk-recent-row"
                style={{ padding: '12px 16px', gap: 16, borderBottom: index < purchases.length - 1 ? '1px solid var(--pro-border)' : 'none', alignItems: 'center', color: 'var(--pro-text)' }}
              >
                <Mono>{buyerDisplay(purchase)}</Mono>
                <span style={{ color: 'var(--mint-400)' }}>{atomicUsdc(purchase.amount)} <span style={{ color: 'var(--pro-text-dim)' }}>USDC</span></span>
                <span style={ellipsisStyle}>{purchase.outcomeId}</span>
                <span style={{ color: 'var(--pro-text-dim)' }}>{relativeTime(purchase.timestamp)}</span>
                {purchase.txHash ? (
                  <a href={basescanTx(purchase.txHash)} target="_blank" rel="noreferrer" className="dk-basescan-link" style={receiptStyle}>
                    tx <Icon name="external" size={11} />
                  </a>
                ) : <Mono dim>–</Mono>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section pad="40px 32px 0">
        <SectionHead kicker="how to use this service from your agent" title={null} />
        <div className="dk-grid-2" style={{ gap: 20 }}>
          <div className="dk-card" style={{ padding: 22 }}>
            <Caption style={{ marginBottom: 12 }}>step 1 · install</Caption>
            <CommandLine cmd="claude mcp add --transport http daski https://sandbox-gateway.daski.io/mcp" />
            <p style={helpTextStyle}>Compatible with Claude Code, Cursor, and other MCP-aware agents.</p>
          </div>
          <div className="dk-card" style={{ padding: 22 }}>
            <Caption style={{ marginBottom: 12 }}>step 2 · prompt your agent</Caption>
            <CommandLine cmd={`Buy "${service.name}" through Daski`} prompt />
            <p style={helpTextStyle}>The agent discovers the outcome, reviews the signed quote, pays, and tracks fulfillment.</p>
          </div>
        </div>
      </Section>
    </>
  );
}

function EmptyPurchases() {
  return (
    <div style={{ border: '1px solid var(--pro-border)', borderRadius: 12, background: 'var(--pro-surface)', padding: 28, textAlign: 'center', color: 'var(--pro-text-dim)', fontSize: 14, lineHeight: 1.6 }}>
      <Mono dim style={{ display: 'block', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>0 recent purchases</Mono>
      Activity will appear here as agents use this service.
    </div>
  );
}

function CommandLine({ cmd, prompt }: { cmd: string; prompt?: boolean }) {
  return (
    <div style={{ background: '#06070b', border: '1px solid var(--pro-border)', borderRadius: 8, padding: '10px 10px 10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'var(--mint-400)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{prompt ? '›' : '$'}</span>
      <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#cfcfdb', background: 'transparent', padding: 0, overflow: 'auto', whiteSpace: 'nowrap' }}>{cmd}</code>
      <CopySmall text={cmd} />
    </div>
  );
}

function CopySmall({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1_500);
        }).catch(() => undefined);
      }}
      style={{ height: 26, padding: '0 9px', borderRadius: 5, cursor: 'pointer', background: 'transparent', border: '1px solid var(--pro-border-hi)', color: copied ? 'var(--mint-400)' : 'var(--pro-text-dim)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={11} strokeWidth={copied ? 2.6 : 1.6} />
      {copied ? 'ok' : 'copy'}
    </button>
  );
}

const ellipsisStyle = { color: 'var(--pro-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
const receiptStyle = { color: 'var(--mint-400)', textTransform: 'none', letterSpacing: 0, fontSize: 11 } as const;
const helpTextStyle = { color: 'var(--pro-text-dim)', fontSize: 13, marginTop: 12, lineHeight: 1.55 };

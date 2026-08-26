import {
  atomicUsdc,
  basescanTx,
  buyerDisplay,
  primaryOutcome,
  type ServiceDetail,
} from '../../lib/api';
import { relativeTime } from '../../lib/marketplacePresentation';
import { Icon } from '../ui/Icon';
import { Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

export function ServicePurchasesAndUsage({ service }: { service: ServiceDetail }) {
  const purchases = primaryOutcome(service).reputation.recentPurchases;
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

const ellipsisStyle = { color: 'var(--pro-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
const receiptStyle = { color: 'var(--mint-400)', textTransform: 'none', letterSpacing: 0, fontSize: 11 } as const;

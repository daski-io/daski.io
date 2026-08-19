import { useState } from 'react';
import {
  atomicUsdc,
  formatDuration,
  primaryOutcome,
  reputationRate,
  type PublicSkill,
  type ServiceDetail,
  type StandardReputation,
} from '../../lib/api';
import { Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

const COLUMNS = '1.1fr 1.4fr 1fr 1fr 1fr 1fr 76px';

export function ServiceSkillsTable({ service }: { service: ServiceDetail }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const reputation = primaryOutcome(service).reputation;
  const satisfaction = reputation.valueWeightedBuyerSatisfactionRate
    ?? reputation.buyerSatisfactionRate;

  return (
    <Section pad="40px 32px 0">
      <SectionHead kicker="skills offered" title={null} />
      <div className="dk-table" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 880 }}>
            <div className="dk-table-head" style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 16, padding: '12px 20px' }}>
              <span>Skill</span><span>Price</span><span>All-time Sales</span>
              <span>Avg Completion</span><span>Completion Rate</span>
              <span>Buyer Satisfaction</span><span />
            </div>
            {service.skills.map((skill, index) => {
              const isOpen = !!open[skill.id];
              return (
                <div key={skill.id} style={{ borderBottom: index < service.skills.length - 1 ? '1px solid var(--pro-border)' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 16, padding: '16px 20px', alignItems: 'center', color: 'var(--pro-text)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{skill.name}</span>
                      <Mono mint style={{ fontSize: 11 }}>{skill.id}</Mono>
                    </div>
                    <Mono style={{ fontSize: 13 }}>{skillPrice(skill, reputation)}</Mono>
                    <Mono style={{ fontSize: 13 }}>{atomicUsdc(reputation.totalPaid)} <DimUnit>USDC</DimUnit></Mono>
                    <Mono style={{ fontSize: 13 }}>
                      {reputation.averageFulfillmentSeconds === null
                        ? '–'
                        : formatDuration(reputation.averageFulfillmentSeconds)}
                    </Mono>
                    <Mono style={{ fontSize: 13 }}>{reputationRate(reputation.completionRate)}</Mono>
                    <Mono style={{ fontSize: 13 }}>{reputationRate(satisfaction)}</Mono>
                    <ExpandButton isOpen={isOpen} onClick={() => setOpen((value) => ({ ...value, [skill.id]: !isOpen }))} />
                  </div>
                  {isOpen && <SkillDescription skill={skill} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

function skillPrice(skill: PublicSkill, reputation: StandardReputation): string {
  if (!skill.paymentRequired) return 'free';
  if (skill.variable) {
    const transactions = BigInt(reputation.transactionCount);
    if (transactions > 1n) {
      return `variable · avg. $${atomicUsdc(
        (BigInt(reputation.totalPaid) / transactions).toString(),
      )}`;
    }
    return 'variable';
  }
  return skill.basePrice ? `$${skill.basePrice}` : 'variable';
}

function SkillDescription({ skill }: { skill: PublicSkill }) {
  return (
    <div style={{ padding: '0 20px 18px' }}>
      <div style={descriptionCardStyle}>
        <Mono dim style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>description</Mono>
        {skill.description ?? '–'}
      </div>
    </div>
  );
}

function ExpandButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-expanded={isOpen} style={{ height: 26, padding: '0 10px', borderRadius: 6, cursor: 'pointer', background: 'transparent', border: `1px solid ${isOpen ? 'var(--mint-700)' : 'var(--pro-border-hi)'}`, color: isOpen ? 'var(--mint-400)' : 'var(--pro-text-dim)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5, justifySelf: 'end' }}>
      {isOpen ? 'Less' : 'More'}<span aria-hidden style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
    </button>
  );
}

function DimUnit({ children }: { children: string }) {
  return <span style={{ color: 'var(--pro-text-dim)', marginLeft: 6, fontSize: 11 }}>{children}</span>;
}

const descriptionCardStyle = { padding: '14px 16px', borderRadius: 8, background: '#06070b', border: '1px solid var(--pro-border)', color: 'var(--pro-text)', fontSize: 13.5, lineHeight: 1.6 };

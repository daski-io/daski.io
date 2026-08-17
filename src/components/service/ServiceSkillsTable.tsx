import { useState } from 'react';
import {
  atomicUsdc,
  formatDuration,
  reputationRate,
  type PublicSkill,
  type ServiceDetail,
} from '../../lib/api';
import { Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

const COLUMNS = '1.1fr 1.4fr 1fr 1fr 1fr 1fr 76px';

export function ServiceSkillsTable({ service }: { service: ServiceDetail }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const reputation = service.standardRail.reputation;
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
                      <Mono mint style={{ fontSize: 13 }}>{skill.id}</Mono>
                      <SkillTags service={service} />
                    </div>
                    <Mono style={{ fontSize: 13 }}>{skillPrice(skill)}</Mono>
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
                  {isOpen && <SkillDescription skill={skill} service={service} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

function skillPrice(skill: PublicSkill): string {
  if (!skill.paymentRequired) return 'free';
  if (skill.variable) return 'dynamic quote';
  return skill.basePrice ? `$${skill.basePrice}` : 'dynamic quote';
}

function SkillTags({ service }: { service: ServiceDetail }) {
  const tags = [
    service.standardRail.bindingProfile,
    service.standardRail.persistentAsset ? 'persistent asset' : null,
  ].filter((value): value is string => value !== null);
  return <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{tags.map((tag) => <span key={tag} style={tagStyle}>{tag}</span>)}</div>;
}

function SkillDescription({ skill, service }: { skill: PublicSkill; service: ServiceDetail }) {
  return (
    <div style={{ padding: '0 20px 18px' }}>
      <div style={descriptionCardStyle}>
        <Mono dim style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>description</Mono>
        {skill.description ?? '–'}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--pro-border)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pro-text-dim)' }}>
          signed deadline: ≤ {formatDuration(service.standardRail.deadlinePolicy.fulfillmentSeconds)} · settlement: USDC Exact-EVM
        </div>
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

const tagStyle = { fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--pro-border)', color: 'var(--pro-text-dim)', letterSpacing: '0.04em' };
const descriptionCardStyle = { padding: '14px 16px', borderRadius: 8, background: '#06070b', border: '1px solid var(--pro-border)', color: 'var(--pro-text)', fontSize: 13.5, lineHeight: 1.6 };

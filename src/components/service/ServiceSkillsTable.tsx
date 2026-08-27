import { useState } from 'react';
import {
  type PublicSkill,
  type ServiceDetail,
} from '../../lib/api';
import { Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

const COLUMNS = '1.5fr 1fr 1fr 1fr 1fr 76px';

export function ServiceSkillsTable({ service }: { service: ServiceDetail }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <Section pad="40px 32px 0">
      <SectionHead kicker="skills offered" title={null} />
      <div className="dk-table" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 780 }}>
            <div className="dk-table-head" style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 16, padding: '12px 20px' }}>
              <span>Skill</span><span>Price</span><span>Fulfillment</span>
              <span>Availability</span><span>Asset type</span><span />
            </div>
            {service.skills.map((skill, index) => {
              const isOpen = !!open[skill.id];
              return (
                <div key={skill.id} style={{ borderBottom: index < service.skills.length - 1 ? '1px solid var(--pro-border)' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 16, padding: '16px 20px', alignItems: 'center', color: 'var(--pro-text)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{skill.name}</span>
                      <Mono mint style={{ fontSize: 11 }}>{skill.skillId}</Mono>
                    </div>
                    <Mono style={{ fontSize: 13 }}>{skillPrice(skill)}</Mono>
                    <Mono style={{ fontSize: 13 }}>{skill.fulfillmentMode}</Mono>
                    <Mono style={{ fontSize: 13 }}>
                      {skill.acceptingNewOrders ? 'open' : 'paused'}
                    </Mono>
                    <Mono style={{ fontSize: 13 }}>{skill.assetType ?? 'none'}</Mono>
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

function skillPrice(skill: PublicSkill): string {
  if (!skill.paymentRequired) return 'free';
  if (skill.variable) return 'variable';
  return skill.basePrice ? `${skill.basePrice} USDC` : 'variable';
}

function SkillDescription({ skill }: { skill: PublicSkill }) {
  return (
    <div style={{ padding: '0 20px 18px' }}>
      <div style={descriptionCardStyle}>
        <Mono dim style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>description</Mono>
        <div>{skill.description}</div>
        <a href={skill.documentationUrl} target="_blank" rel="noreferrer" className="dk-link-mint" style={{ display: 'inline-block', marginTop: 10 }}>
          Provider documentation
        </a>
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

const descriptionCardStyle = { padding: '14px 16px', borderRadius: 8, background: '#06070b', border: '1px solid var(--pro-border)', color: 'var(--pro-text)', fontSize: 13.5, lineHeight: 1.6 };

import {
  type PublicSkill,
  type ServiceDetail,
} from '../../lib/api';
import { Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

const COLUMNS = '1.5fr 1fr 1fr 1fr 1fr 76px';

export function ServiceSkillsTable({ service }: { service: ServiceDetail }) {
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
            {service.skills.map((skill, index) => (
              <details key={skill.id} className="dk-skill-disclosure" style={{ borderBottom: index < service.skills.length - 1 ? '1px solid var(--pro-border)' : 'none' }}>
                <summary style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 16, padding: '16px 20px', alignItems: 'center', color: 'var(--pro-text)' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{skill.name}</span>
                    <Mono mint style={{ fontSize: 11 }}>{skill.skillId}</Mono>
                  </span>
                  <Mono style={{ fontSize: 13 }}>{skillPrice(skill)}</Mono>
                  <Mono style={{ fontSize: 13 }}>{skill.fulfillmentMode}</Mono>
                  <Mono style={{ fontSize: 13 }}>
                    {skill.acceptingNewOrders ? 'open' : 'paused'}
                  </Mono>
                  <Mono style={{ fontSize: 13 }}>{skill.assetType ?? 'none'}</Mono>
                  <span className="dk-skill-toggle" aria-hidden="true">
                    <span className="dk-skill-more">More</span>
                    <span className="dk-skill-less">Less</span>
                    <span className="dk-skill-chevron">▾</span>
                  </span>
                </summary>
                <SkillDescription skill={skill} />
              </details>
            ))}
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

const descriptionCardStyle = { padding: '14px 16px', borderRadius: 8, background: '#06070b', border: '1px solid var(--pro-border)', color: 'var(--pro-text)', fontSize: 13.5, lineHeight: 1.6 };

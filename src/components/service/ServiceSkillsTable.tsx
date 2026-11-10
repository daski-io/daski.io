import type { ReactNode } from 'react';
import {
  type PublicFreeSkill,
  type PublicOwnerAction,
  type PublicSkill,
  type ServiceDetail,
} from '../../lib/api';
import { Mono } from '../ui/Mono';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';

const COLUMNS = '1.5fr 1fr 1fr 1fr 1fr 76px';
const ACTION_COLUMNS = '1.5fr 1fr 1fr 1fr 76px';
const FREE_COLUMNS = '1.5fr 1fr 1fr 76px';

export function ServiceSkillsTable({ service }: { service: ServiceDetail }) {
  return (
    <>
      <Section pad="40px 32px 0">
        <SectionHead kicker="skills offered" title={null} />
        <DisclosureTable
          columns={COLUMNS}
          headings={['Skill', 'Price', 'Fulfillment', 'Availability', 'Asset type']}
          rows={service.skills.map((skill) => ({
            key: skill.id,
            cells: [
              <SkillName key="name" name={skill.name} id={skill.skillId} />,
              <Mono key="price" style={{ fontSize: 13 }}>{skillPrice(skill)}</Mono>,
              <Mono key="mode" style={{ fontSize: 13 }}>{skill.fulfillmentMode}</Mono>,
              <Mono key="open" style={{ fontSize: 13 }}>
                {skill.acceptingNewOrders ? 'open' : 'paused'}
              </Mono>,
              <Mono key="asset" style={{ fontSize: 13 }}>{skill.assetType ?? 'none'}</Mono>,
            ],
            description: skill.description,
            documentationUrl: skill.documentationUrl,
          }))}
        />
      </Section>
      {service.ownerActions.length > 0 && (
        <Section pad="40px 32px 0">
          <SectionHead
            kicker="owner actions"
            title={null}
            subtitle="Free for the owner of an asset bought here. The owner's wallet authorizes each action through the Daski gateway."
          />
          <DisclosureTable
            columns={ACTION_COLUMNS}
            headings={['Action', 'Price', 'Effect', 'Asset type']}
            rows={service.ownerActions.map((action) => ({
              key: action.actionId,
              cells: [
                <SkillName key="name" name={action.name} id={action.actionId} />,
                <Mono key="price" style={{ fontSize: 13 }}>free</Mono>,
                <Mono key="effect" style={{ fontSize: 13 }}>{actionEffect(action)}</Mono>,
                <Mono key="asset" style={{ fontSize: 13 }}>{action.assetType}</Mono>,
              ],
              description: action.description,
              documentationUrl: action.documentationUrl,
            }))}
          />
        </Section>
      )}
      {service.freeSkills.length > 0 && (
        <Section pad="40px 32px 0">
          <SectionHead
            kicker="free skills"
            title={null}
            subtitle="Free and open to any agent, called directly on the provider's A2A endpoint named in its Agent Card."
          />
          <DisclosureTable
            columns={FREE_COLUMNS}
            headings={['Skill', 'Price', 'Access']}
            rows={service.freeSkills.map((skill: PublicFreeSkill) => ({
              key: skill.skillId,
              cells: [
                <SkillName key="name" name={skill.name} id={skill.skillId} />,
                <Mono key="price" style={{ fontSize: 13 }}>free</Mono>,
                <Mono key="access" style={{ fontSize: 13 }}>provider A2A</Mono>,
              ],
              description: skill.description,
              documentationUrl: skill.documentationUrl,
            }))}
          />
        </Section>
      )}
    </>
  );
}

interface DisclosureRow {
  key: string;
  cells: ReactNode[];
  description: string | null;
  documentationUrl: string | null;
}

function DisclosureTable({ columns, headings, rows }: {
  columns: string;
  headings: string[];
  rows: DisclosureRow[];
}) {
  return (
    <div className="dk-table" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 780 }}>
          <div className="dk-table-head" style={{ display: 'grid', gridTemplateColumns: columns, gap: 16, padding: '12px 20px' }}>
            {headings.map((heading) => <span key={heading}>{heading}</span>)}
            <span />
          </div>
          {rows.map((row, index) => (
            <details key={row.key} className="dk-skill-disclosure" style={{ borderBottom: index < rows.length - 1 ? '1px solid var(--pro-border)' : 'none' }}>
              <summary style={{ display: 'grid', gridTemplateColumns: columns, gap: 16, padding: '16px 20px', alignItems: 'center', color: 'var(--pro-text)' }}>
                {row.cells}
                <span className="dk-skill-toggle" aria-hidden="true">
                  <span className="dk-skill-more">More</span>
                  <span className="dk-skill-less">Less</span>
                  <span className="dk-skill-chevron">▾</span>
                </span>
              </summary>
              <SkillDescription description={row.description} documentationUrl={row.documentationUrl} />
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkillName({ name, id }: { name: string; id: string }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
      <Mono mint style={{ fontSize: 11 }}>{id}</Mono>
    </span>
  );
}

function skillPrice(skill: PublicSkill): string {
  if (!skill.paymentRequired) return 'free';
  if (skill.variable) return 'variable';
  return skill.basePrice ? `${skill.basePrice} USDC` : 'variable';
}

// A destructive action asks the owner to confirm a staged request first.
export function actionEffect(action: Pick<PublicOwnerAction, 'destructive'>): string {
  return action.destructive ? 'destructive' : 'standard';
}

function SkillDescription({ description, documentationUrl }: {
  description: string | null;
  documentationUrl: string | null;
}) {
  return (
    <div style={{ padding: '0 20px 18px' }}>
      <div style={descriptionCardStyle}>
        <Mono dim style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>description</Mono>
        <div>{description ?? 'The provider has not published a description for this action.'}</div>
        {documentationUrl && (
          <a href={documentationUrl} target="_blank" rel="noreferrer" className="dk-link-mint" style={{ display: 'inline-block', marginTop: 10 }}>
            Provider documentation
          </a>
        )}
      </div>
    </div>
  );
}

const descriptionCardStyle = { padding: '14px 16px', borderRadius: 8, background: '#06070b', border: '1px solid var(--pro-border)', color: 'var(--pro-text)', fontSize: 13.5, lineHeight: 1.6 };

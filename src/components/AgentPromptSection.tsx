import type { ReactNode } from 'react';
import { CodeBlock } from './ui/CodeBlock';
import { Section } from './ui/Section';
import { SectionHead } from './ui/SectionHead';

export const AGENT_PROMPT =
  'Fetch https://sandbox-gateway.daski.io/skills/setup.md and use the returned '
  + 'setup instructions to buy [service offered on daski]';

interface AgentPromptSectionProps {
  pad?: string;
  action?: ReactNode;
}

export function AgentPromptSection({ pad, action }: AgentPromptSectionProps) {
  return (
    <Section pad={pad}>
      <SectionHead
        kicker="Agent prompt"
        title="Hand it to your agent."
        subtitle="Copy-paste this prompt to empower your agent to buy services on daski marketplace."
        action={action}
      />
      <CodeBlock copy={AGENT_PROMPT} copyLabel="Copy" size="lg">
        {AGENT_PROMPT}
      </CodeBlock>
    </Section>
  );
}

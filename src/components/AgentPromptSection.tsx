import type { ReactNode } from 'react';
import { CodeBlock } from './ui/CodeBlock';
import { Section } from './ui/Section';
import { SectionHead } from './ui/SectionHead';
import { agentPrompt } from '../lib/chains';

interface AgentPromptSectionProps {
  /** Public gateway origin of the active network; null hides the section while the network has no gateway. */
  gatewayUrl: string | null;
  pad?: string;
  action?: ReactNode;
}

export function AgentPromptSection({ gatewayUrl, pad, action }: AgentPromptSectionProps) {
  if (gatewayUrl === null) return null;
  const prompt = agentPrompt(gatewayUrl);
  return (
    <Section pad={pad}>
      <SectionHead
        kicker="Agent prompt"
        title="Hand it to your agent."
        subtitle="Copy-paste this prompt to empower your agent to buy services on daski marketplace."
        action={action}
      />
      <CodeBlock copy={prompt} copyLabel="Copy" size="lg">
        {prompt}
      </CodeBlock>
    </Section>
  );
}

import type { ReactNode } from 'react';
import { CodeBlock } from './ui/CodeBlock';
import { Section } from './ui/Section';
import { SectionHead } from './ui/SectionHead';
import { agentPrompt } from '../lib/chains';

interface AgentPromptSectionProps {
  /** Public gateway origin of the active network; null hides the section while the network has no gateway. */
  gatewayUrl: string | null;
  siteUrl: string;
  /** Names the service in the prompt on a service page. */
  serviceName?: string;
  pad?: string;
  action?: ReactNode;
}

export function AgentPromptSection({ gatewayUrl, siteUrl, serviceName, pad, action }: AgentPromptSectionProps) {
  if (gatewayUrl === null) return null;
  const service = serviceName?.replace(/\s+/g, ' ').trim();
  const prompt = agentPrompt(siteUrl, service);
  return (
    <Section pad={pad}>
      <SectionHead
        kicker="Agent prompt"
        title="Hand it to your agent."
        subtitle={service
          ? `Copy-paste this prompt to empower your agent to buy ${service} on daski marketplace.`
          : 'Copy-paste this prompt to empower your agent to buy services on daski marketplace.'}
        action={action}
      />
      <CodeBlock copy={prompt} copyLabel="Copy" size="lg">
        {prompt}
      </CodeBlock>
    </Section>
  );
}

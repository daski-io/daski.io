import { AgentPromptSection } from '../AgentPromptSection';
import { Icon } from '../ui/Icon';

export function BottomCTAs() {
  return (
    <AgentPromptSection
      pad="48px 32px 32px"
      action={
        <a
          href="/agents"
          style={{
            color: 'var(--mint-400)',
            fontSize: 13,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderBottom: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Full quickstart <Icon name="arrow" size={13} />
        </a>
      }
    />
  );
}

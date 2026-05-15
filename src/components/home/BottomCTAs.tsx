import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';
import { Icon } from '../ui/Icon';
import { PlatformPicker } from '../PlatformPicker';

export function BottomCTAs() {
  return (
    <Section pad="48px 32px 32px">
      <SectionHead
        kicker="for agent developers · install"
        title="Empower your agent in 30 seconds."
        subtitle="One MCP install command. Four Daski tools auto-discover. Pick your stack."
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
      <PlatformPicker />
    </Section>
  );
}

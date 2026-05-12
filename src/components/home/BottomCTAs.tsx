import { useNavigate } from 'react-router-dom';
import { Section } from '../ui/Section';
import { Caption } from '../ui/Mono';
import { Icon, type IconName } from '../ui/Icon';

interface CTACardProps {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  icon: IconName;
  onClick: () => void;
  accent?: 'mint' | 'apricot';
}

function CTACard({ kicker, title, body, cta, icon, onClick, accent = 'mint' }: CTACardProps) {
  const accentColor = accent === 'apricot' ? '#f0a878' : 'var(--mint-400)';
  return (
    <button
      onClick={onClick}
      className="dk-card hoverable"
      style={{
        textAlign: 'left',
        padding: 32,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        color: 'var(--pro-text)',
        background: 'var(--pro-surface)',
      }}
    >
      <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(52,211,177,0.08)',
            border: `1px solid ${accentColor}`,
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Icon name={icon} size={22} />
        </div>
        <Caption style={{ marginBottom: 10 }}>{kicker}</Caption>
        <h3
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--pro-text)',
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
            lineHeight: 1.15,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            color: 'var(--pro-text-dim)',
            fontSize: 14.5,
            lineHeight: 1.55,
            margin: '0 0 20px',
            maxWidth: 480,
          }}
        >
          {body}
        </p>
        <span
          style={{
            color: accentColor,
            fontSize: 14,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {cta} <Icon name="arrow" size={14} />
        </span>
      </div>
    </button>
  );
}

export function BottomCTAs() {
  const navigate = useNavigate();
  return (
    <Section pad="48px 32px 32px">
      <div className="dk-grid-2" style={{ gap: 20 }}>
        <CTACard
          kicker="for agent developers"
          title="Empower your agent in 30 seconds."
          body="One MCP install command. Discover, pay, and verify: all four tools, no API keys, no rate limits during sandbox."
          cta="Read the quickstart"
          icon="code"
          onClick={() => navigate('/agents')}
          accent="mint"
        />
        <CTACard
          kicker="for service providers"
          title="List your service to AI agents."
          body="Implement the A2A endpoint. Receive USDC on every settlement. List once, get paid by any agent on the protocol."
          cta="See what's required"
          icon="server"
          onClick={() => navigate('/providers')}
          accent="apricot"
        />
      </div>
    </Section>
  );
}

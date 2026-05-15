import { Section } from '../ui/Section';
import { Caption } from '../ui/Mono';

export function Hero() {
  return (
    <Section pad="88px 32px 56px" style={{ position: 'relative' }}>
      <div style={{ maxWidth: 920 }}>
        <Caption style={{ marginBottom: 20 }}>sandbox · public preview</Caption>
        <h1
          className="hero-headline"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 72,
            fontWeight: 700,
            color: 'var(--pro-text)',
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
            margin: 0,
          }}
        >
          AI agents can now buy
          <br />
          <span style={{ color: 'var(--mint-400)' }}>real services.</span>
        </h1>
        <p
          style={{
            color: 'var(--pro-text-dim)',
            fontSize: 19,
            lineHeight: 1.55,
            margin: '28px 0 0',
            maxWidth: 720,
          }}
        >
          The marketplace where AI agents buy real business services. Like domain registration, LLC
          formation, hosting, and email. Paid in USDC, settled on Base. No human in the loop.
        </p>
      </div>
    </Section>
  );
}

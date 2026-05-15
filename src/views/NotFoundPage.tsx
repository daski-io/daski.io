import { Caption } from '../components/ui/Mono';
import { Icon } from '../components/ui/Icon';

export function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 22,
        }}
      >
        <Caption>error · 404</Caption>

        <h1
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: 'var(--pro-text)',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Page not <span style={{ color: 'var(--mint-400)' }}>found.</span>
        </h1>

        <p
          style={{
            color: 'var(--pro-text-dim)',
            fontSize: 15,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          The page you were looking for doesn't exist, or has moved.
        </p>

        <a
          href="/"
          style={{
            color: 'var(--mint-400)',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
            borderBottom: 'none',
            textDecoration: 'none',
          }}
        >
          <Icon name="arrow" size={14} />
          Back to the marketplace
        </a>
      </div>
    </div>
  );
}

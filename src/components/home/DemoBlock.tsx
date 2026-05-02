import { useEffect, useState, type ReactNode } from 'react';
import { Section } from '../ui/Section';
import { Caption, Mono } from '../ui/Mono';
import { Icon } from '../ui/Icon';

const TOTAL_STEPS = 6;

const BEATS = [
  { t: 'Agent recognized it needed a domain', sub: 'no human prompt' },
  { t: 'Discovered a verified provider via Daski', sub: 'bluet group · domains' },
  { t: 'Authorized x402 payment with its own wallet', sub: '4.99 USDC · EIP-712 signed' },
  { t: 'Domain registered and owned by the agent', sub: '47 seconds end-to-end' },
];

export function DemoBlock() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setStep((s) => (s + 1) % (TOTAL_STEPS + 1));
    }, 1500);
    return () => window.clearInterval(t);
  }, []);

  const beatStep = [0, 0, 1, 1, 2, 2, 3, 3][Math.min(step, 7)];

  return (
    <Section pad="32px 32px 64px">
      <div style={{ marginBottom: 22 }}>
        <Caption style={{ marginBottom: 8 }}>watch · 47s</Caption>
        <h2
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: 'var(--pro-text)',
            letterSpacing: '-0.025em',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          An agent decides it needs a domain. And buys one.
        </h2>
        <p
          style={{
            color: 'var(--pro-text-dim)',
            fontSize: 16,
            margin: '12px 0 0',
            maxWidth: 720,
            lineHeight: 1.55,
          }}
        >
          No human prompts mid-task. No API key juggling. No custodian. Just an agent reasoning
          through its work and using Daski when it needs a real service.
        </p>
      </div>

      <div
        className="demo-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 0,
          background: 'var(--pro-surface)',
          border: '1px solid var(--pro-border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Trace pane */}
        <div style={{ position: 'relative', background: '#06070b', minHeight: 560 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--pro-border)',
              background: 'linear-gradient(#0c0d13, #08090f)',
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef5a6b' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#e7b34a' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#5dd6ad' }} />
            </div>
            <Mono dim style={{ fontSize: 11, letterSpacing: '0.04em' }}>
              ~/agents/founder · claude code
            </Mono>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--pro-text-dim)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--mint-400)',
                  animation: 'dk-pulse 1.6s ease-in-out infinite',
                }}
              />
              live
            </span>
          </div>

          <AgentTrace step={step} />

          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            }}
          >
            <Mono dim style={{ fontSize: 11, letterSpacing: '0.04em' }}>
              auto-loop
            </Mono>
            <div
              style={{
                flex: 1,
                height: 2,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'var(--mint-400)',
                  width: `${(step / TOTAL_STEPS) * 100}%`,
                  transition: 'width 200ms linear',
                }}
              />
            </div>
            <Mono dim style={{ fontSize: 11, letterSpacing: '0.04em' }}>
              0:{String(Math.min(47, Math.round((step / TOTAL_STEPS) * 47))).padStart(2, '0')}
            </Mono>
          </div>
        </div>

        {/* What just happened */}
        <div
          style={{
            padding: '24px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--pro-border)',
            minHeight: 560,
          }}
        >
          <Caption style={{ marginBottom: 18 }}>what just happened</Caption>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {BEATS.map((b, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '16px 0',
                  borderBottom: i < BEATS.length - 1 ? '1px solid var(--pro-border)' : 'none',
                  opacity: i <= beatStep ? 1 : 0.32,
                  transition: 'opacity 240ms var(--ease)',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: i <= beatStep ? 'var(--mint-400)' : 'var(--pro-surface2)',
                      color: i <= beatStep ? '#04221b' : 'var(--pro-text-dim)',
                      border:
                        '1px solid ' + (i <= beatStep ? 'var(--mint-400)' : 'var(--pro-border)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {i <= beatStep ? <Icon name="check" size={13} strokeWidth={2.5} /> : i + 1}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: 'var(--pro-text)',
                      fontWeight: 500,
                      marginBottom: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {b.t}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--pro-text-dim)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {b.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function Block({ children }: { children: ReactNode }) {
  return (
    <div className="fadein" style={{ marginTop: 12 }}>
      {children}
    </div>
  );
}

function AgentTrace({ step }: { step: number }) {
  return (
    <div
      style={{
        padding: '22px 26px',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        lineHeight: 1.7,
        color: '#cfcfdb',
        minHeight: 480,
      }}
    >
      {step >= 0 && (
        <Block>
          <div>
            <span className="mint">agent</span> <span className="dim">·</span>{' '}
            <span className="dim">thinking</span>
          </div>
          <div className="indent">└─ I'll need a domain for the business.</div>
        </Block>
      )}
      {step >= 1 && (
        <Block>
          <div>
            <span className="dim">[mcp:daski]</span> <span className="ink">check_availability</span>
          </div>
          <div className="indent">
            └─ <span className="ink">uat04291.info</span> <span className="dim">·</span>{' '}
            <span className="mint">available</span> <span className="dim">·</span>{' '}
            <span className="amber">4.99 USDC</span>
          </div>
        </Block>
      )}
      {step >= 2 && (
        <Block>
          <div>
            <span className="dim">[mcp:daski]</span> <span className="ink">buy_service</span>
          </div>
          <div className="indent">
            └─ skill: <span className="ink">register-domain</span>
          </div>
          <div className="indent">
            payment plan ready <span className="dim">·</span>{' '}
            <span className="dim">awaiting signature</span>
          </div>
        </Block>
      )}
      {step >= 3 && (
        <Block>
          <div>
            <span className="dim">[wallet]</span> sign EIP-712 transfer
          </div>
          <div className="indent">
            └─ <span className="mint">✓ signed</span>{' '}
            <span className="dim">(4.99 USDC authorized)</span>
          </div>
        </Block>
      )}
      {step >= 4 && (
        <Block>
          <div>
            <span className="dim">[mcp:daski]</span> <span className="ink">settle_payment</span>
          </div>
          <div className="indent">
            └─ <span className="mint">✓ settled</span> <span className="dim">·</span> tx{' '}
            <span className="sky">0x8fff…74c96</span>
          </div>
          <div className="indent">x402 payment confirmed</div>
        </Block>
      )}
      {step >= 5 && (
        <Block>
          <div>
            <span className="dim">[mcp:daski]</span> <span className="ink">submit_task</span>{' '}
            <span className="dim">→ provider</span>
          </div>
          <div className="indent">
            └─ <span className="sky">task-043b…b95f</span> <span className="dim">·</span> state:{' '}
            <span className="mint">completed</span>
          </div>
        </Block>
      )}
      {step >= 6 && (
        <Block>
          <div>
            <span className="mint">agent</span> <span className="dim">·</span> result
          </div>
          <div className="indent">
            └─ <span className="ink">uat04291.info</span> registered.
          </div>
        </Block>
      )}
    </div>
  );
}

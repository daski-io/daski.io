import { useState } from 'react';
import { Icon, type IconName } from './ui/Icon';
import { IconTile } from './ui/IconTile';
import { Mono } from './ui/Mono';
import { CopyButton } from './ui/CopyButton';

interface Platform {
  id: string;
  name: string;
  sub: string;
  icon: IconName;
  kind: 'cmd' | 'url';
  cmd: string;
  cmdLabel: string;
  note: string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    sub: "Anthropic's coding agent.",
    icon: 'bolt',
    kind: 'cmd',
    cmd: 'claude mcp add daski https://sandbox-gateway.daski.io/mcp',
    cmdLabel: 'one-line install',
    note: "Restart Claude Code. Daski's four tools register automatically over MCP.",
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    sub: 'Codex CLI · streamable HTTP.',
    icon: 'code',
    kind: 'cmd',
    cmd: 'codex mcp add daski --url https://sandbox-gateway.daski.io/mcp',
    cmdLabel: 'one-line install',
    note: 'Tools appear on the next codex run. No API keys, no rate limits during sandbox.',
  },
  {
    id: 'byo',
    name: 'Bring your own',
    sub: 'Cursor · Continue · custom MCP clients.',
    icon: 'plug',
    kind: 'url',
    cmd: 'https://sandbox-gateway.daski.io/mcp',
    cmdLabel: 'MCP gateway URL',
    note: 'Point any MCP-compatible client at the URL above. Streamable HTTP — auth optional in sandbox.',
  },
];

/**
 * Unified platform picker. One bordered box with a tab strip for each
 * MCP-compatible agent runtime; the body (install command + note) swaps
 * in place. Used on the Home page and on the For Agents page.
 */
export function PlatformPicker() {
  const [active, setActive] = useState('claude');
  const p = PLATFORMS.find((x) => x.id === active) ?? PLATFORMS[0];

  return (
    <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--pro-border)',
          background: 'var(--pro-bg)',
        }}
      >
        {PLATFORMS.map((pl, i) => {
          const isActive = pl.id === active;
          return (
            <button
              key={pl.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(pl.id)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '15px 16px',
                background: isActive ? 'var(--pro-surface)' : 'transparent',
                border: 'none',
                borderRight: i < PLATFORMS.length - 1 ? '1px solid var(--pro-border)' : 'none',
                borderBottom: '2px solid ' + (isActive ? 'var(--mint-400)' : 'transparent'),
                marginBottom: -1,
                color: isActive ? 'var(--pro-text)' : 'var(--pro-text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                transition: 'color 180ms var(--ease), background 180ms var(--ease)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <Icon name={pl.icon} size={15} color={isActive ? 'var(--mint-400)' : 'var(--pro-text-dim)'} />
              <span>{pl.name}</span>
            </button>
          );
        })}
      </div>

      <div className="fadein" key={p.id} style={{ padding: '26px 28px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
          <IconTile name={p.icon} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 19,
                fontWeight: 600,
                color: 'var(--pro-text)',
                letterSpacing: '-0.015em',
                marginBottom: 4,
              }}
            >
              {p.name}
            </div>
            <div style={{ fontSize: 14, color: 'var(--pro-text-dim)' }}>{p.sub}</div>
          </div>
          <Mono
            dim
            style={{
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              paddingTop: 6,
            }}
          >
            ~30s
          </Mono>
        </div>

        <div
          style={{
            background: '#06070b',
            border: '1px solid var(--pro-border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--pro-border)',
              background: 'linear-gradient(#0c0d13, #08090f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Mono dim style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {p.cmdLabel}
            </Mono>
            <CopyButton text={p.cmd} label="Copy" size="sm" />
          </div>
          <div
            style={{
              padding: '18px 20px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13.5,
              lineHeight: 1.65,
              color: p.kind === 'url' ? 'var(--mint-400)' : '#cfcfdb',
              wordBreak: 'break-all',
            }}
          >
            {p.kind === 'cmd' && <span style={{ color: 'var(--pro-text-dim)' }}>$ </span>}
            {p.cmd}
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            paddingLeft: 18,
            position: 'relative',
            color: 'var(--pro-text-dim)',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 9,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--mint-400)',
              opacity: 0.75,
            }}
          />
          {p.note}
        </div>
      </div>
    </div>
  );
}

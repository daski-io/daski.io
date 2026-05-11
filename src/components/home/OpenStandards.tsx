import { useState } from 'react';
import { Section } from '../ui/Section';
import { SectionHead } from '../ui/SectionHead';
import { Mono } from '../ui/Mono';
import { Icon } from '../ui/Icon';

type ProtocolKey = 'mcp' | 'x402' | 'a2a' | 'register' | 'erc8004';

interface Protocol {
  title: string;
  desc: string;
}

const PROTOCOLS: Record<ProtocolKey, Protocol> = {
  mcp: {
    title: 'MCP · Model Context Protocol',
    desc:
      'How agents talk to tools and services. Buyer agents discover services and request payment quotes from the Daski Gateway over MCP.',
  },
  x402: {
    title: 'x402 · HTTP-native payments',
    desc:
      'Agents pay the way browsers handle 402 Payment Required. The buyer pays Base directly. Daski never custodies funds.',
  },
  a2a: {
    title: 'A2A · Agent-to-Agent',
    desc:
      'Buyers and providers talk directly. Pre-purchase questions ("do you support .io?") and post-payment fulfillment (submit task, poll status). No proxy in between.',
  },
  register: {
    title: 'Provider registration · Agent Card',
    desc:
      'Providers register their agent in ProviderRegistry and each marketable offering in ServiceRegistry, then publish a signed Agent Card URI on-chain. The gateway fetches and caches the card, health-probes the provider, and serves it to buyers during discovery.',
  },
  erc8004: {
    title: 'ERC-8004 · Identity',
    desc:
      'On-chain identity for every actor — buyer, gateway, provider — as an ERC-8004 NFT. Services are a separate on-chain entity in ServiceRegistry, keyed to the provider that owns them. No central account system.',
  },
};

export function OpenStandards() {
  const [open, setOpen] = useState<ProtocolKey | null>(null);

  return (
    <Section pad="48px 32px 16px">
      <SectionHead
        kicker="open standards"
        title="No walled garden. Just standards."
        subtitle="Daski is a coordination layer, not a middleman. Discovery and payment quoting flow through the Gateway. Settlement happens on-chain. Buyers and providers talk directly for everything else."
      />

      <div className="dk-card" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
        <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.25 }} />
        <NetworkDiagram open={open} setOpen={setOpen} />

        {open && (
          <div
            className="fadein"
            style={{
              position: 'relative',
              margin: '0 24px 24px',
              padding: '14px 16px',
              background: '#06070b',
              border: '1px solid var(--mint-700)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <Icon name="spark" size={14} color="var(--mint-400)" />
            <div style={{ flex: 1 }}>
              <Mono mint style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {PROTOCOLS[open].title}
              </Mono>
              <div style={{ fontSize: 13, color: 'var(--pro-text)', marginTop: 4, lineHeight: 1.55 }}>
                {PROTOCOLS[open].desc}
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

interface NetworkDiagramProps {
  open: ProtocolKey | null;
  setOpen: (k: ProtocolKey | null) => void;
}

function NetworkDiagram({ open, setOpen }: NetworkDiagramProps) {
  const W = 1240;
  const H = 620;
  const BW = 220;
  const BH = 130;
  const ROW1 = 180;
  const ROW2 = 420;

  const buyer = { x: 60, y: ROW1, w: BW, h: BH, label: 'Buyer', sub: 'AI Agent' };
  const gateway = { x: (W - BW) / 2, y: ROW1, w: BW, h: BH, label: 'Daski Gateway', sub: 'Facilitator' };
  const provider = { x: W - BW - 60, y: ROW1, w: BW, h: BH, label: 'Provider', sub: 'Real-world services' };
  const base = {
    x: (W - BW) / 2,
    y: ROW2,
    w: BW,
    h: BH + 50,
    label: 'Base Chain',
    sub: 'Payment Router',
  };

  const cx = (b: { x: number; w: number }) => b.x + b.w / 2;

  const stripH = 56;
  const strip = {
    x: base.x + 14,
    y: base.y + base.h - stripH - 14,
    w: base.w - 28,
    h: stripH,
  };

  const RAIL_Y = ROW1 + BH / 2;

  const a2aRail = (() => {
    const ax = cx(buyer);
    const bx = cx(provider);
    const ay = buyer.y;
    const by = provider.y;
    const railY = 70;
    const d = `M ${ax} ${ay} L ${ax} ${railY} L ${bx} ${railY} L ${bx} ${by}`;
    const isOpen = open === 'a2a';
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : 'a2a')}>
        <path
          d={d}
          fill="none"
          stroke="#f0a878"
          strokeWidth={isOpen ? 2 : 1.5}
          opacity={isOpen ? 1 : 0.85}
          markerStart="url(#arrow-apricot)"
          markerEnd="url(#arrow-apricot)"
        />
        <RailChip
          x={(ax + bx) / 2}
          y={railY}
          chip="A2A"
          desc="Fulfillment"
          tone="apricot"
          active={isOpen}
        />
      </g>
    );
  })();

  const mcpRail = (() => {
    const isOpen = open === 'mcp';
    const ax = buyer.x + buyer.w;
    const bx = gateway.x;
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : 'mcp')}>
        <line
          x1={ax}
          y1={RAIL_Y}
          x2={bx}
          y2={RAIL_Y}
          stroke="#34d3b1"
          strokeWidth={isOpen ? 2 : 1.5}
          opacity={isOpen ? 1 : 0.85}
          markerStart="url(#arrow-mint)"
          markerEnd="url(#arrow-mint)"
        />
        <RailChip
          x={(ax + bx) / 2}
          y={RAIL_Y}
          chip="MCP"
          desc="Discovery · Quote"
          tone="mint"
          active={isOpen}
        />
      </g>
    );
  })();

  const serviceInfoRail = (() => {
    const isOpen = open === 'register';
    const ax = gateway.x + gateway.w;
    const bx = provider.x;
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : 'register')}>
        <line
          x1={ax}
          y1={RAIL_Y}
          x2={bx}
          y2={RAIL_Y}
          stroke="#7a8092"
          strokeWidth={isOpen ? 1.6 : 1}
          strokeDasharray="6 5"
          opacity={isOpen ? 1 : 0.7}
          markerStart="url(#arrow-dim)"
          markerEnd="url(#arrow-dim)"
        />
        <RailChip
          x={(ax + bx) / 2}
          y={RAIL_Y}
          chip="Service Info"
          tone="dim"
          active={isOpen}
          labelOnly
        />
      </g>
    );
  })();

  const x402Rail = (() => {
    const isOpen = open === 'x402';
    const startX = cx(buyer);
    const startY = buyer.y + buyer.h;
    const endX = base.x;
    const endY = base.y + 36;
    const cornerY = endY;
    const d = `M ${startX} ${startY} L ${startX} ${cornerY} L ${endX} ${cornerY}`;
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : 'x402')}>
        <path
          d={d}
          fill="none"
          stroke="#6aa9ee"
          strokeWidth={isOpen ? 2 : 1.5}
          opacity={isOpen ? 1 : 0.85}
          markerEnd="url(#arrow-info)"
        />
        <RailChip
          x={(startX + endX) / 2}
          y={cornerY}
          chip="x402"
          desc="Payment"
          tone="info"
          active={isOpen}
        />
      </g>
    );
  })();

  const usdcRail = (() => {
    const startX = base.x + base.w;
    const startY = base.y + 36;
    const endX = cx(provider);
    const endY = provider.y + provider.h;
    const cornerY = startY;
    const d = `M ${startX} ${startY} L ${endX} ${cornerY} L ${endX} ${endY}`;
    return (
      <g>
        <path
          d={d}
          fill="none"
          stroke="#6aa9ee"
          strokeWidth={1.5}
          opacity={0.85}
          markerEnd="url(#arrow-info)"
        />
        <RailChip x={(startX + endX) / 2} y={cornerY} chip="USDC" desc="Payout" tone="info" />
      </g>
    );
  })();

  const ercRail = (() => {
    const isOpen = open === 'erc8004';
    const stroke = isOpen ? '#34d3b1' : '#3a8a76';
    const opacity = isOpen ? 1 : 0.55;
    const dropY = strip.y + strip.h / 2;
    const buyerDropX = buyer.x + buyer.w - 32;
    const provDropX = provider.x + 32;
    return (
      <g>
        <path
          d={`M ${buyerDropX} ${buyer.y + buyer.h} L ${buyerDropX} ${dropY} L ${strip.x} ${dropY}`}
          fill="none"
          stroke={stroke}
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity={opacity}
        />
        <path
          d={`M ${provDropX} ${provider.y + provider.h} L ${provDropX} ${dropY} L ${strip.x + strip.w} ${dropY}`}
          fill="none"
          stroke={stroke}
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity={opacity}
        />
      </g>
    );
  })();

  return (
    <div style={{ position: 'relative', padding: '32px 36px 28px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        <defs>
          <marker id="arrow-mint" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#34d3b1" />
          </marker>
          <marker id="arrow-info" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#6aa9ee" />
          </marker>
          <marker id="arrow-apricot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#f0a878" />
          </marker>
          <marker id="arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#7a8092" />
          </marker>
        </defs>

        {a2aRail}
        {mcpRail}
        {serviceInfoRail}
        {x402Rail}
        {usdcRail}
        {ercRail}

        <BoxActor box={buyer} tone="info" icon="user" />
        <BoxActor box={gateway} tone="mint" icon="layers" />
        <BoxActor box={provider} tone="apricot" icon="server" />
        <BoxActor
          box={base}
          tone="info"
          icon="link"
          identityStrip={strip}
          identityActive={open === 'erc8004'}
          onIdentityClick={() => setOpen(open === 'erc8004' ? null : 'erc8004')}
        />
      </svg>
    </div>
  );
}

interface RailChipProps {
  x: number;
  y: number;
  chip: string;
  desc?: string;
  tone: 'mint' | 'info' | 'apricot' | 'dim';
  active?: boolean;
  labelOnly?: boolean;
}

function RailChip({ x, y, chip, desc, tone, active, labelOnly }: RailChipProps) {
  const colors = { mint: '#34d3b1', info: '#6aa9ee', apricot: '#f0a878', dim: '#9aa0b3' } as const;
  const c = colors[tone];
  const chipPx = chip.length * (chip.length > 6 ? 7.5 : 9);
  const descPx = desc ? desc.length * 6.2 + 18 : 0;
  const w = Math.max(70, chipPx + descPx + 24);
  return (
    <g transform={`translate(${x - w / 2} ${y - 14})`}>
      <rect
        width={w}
        height="28"
        rx="14"
        fill="#06070b"
        stroke={active ? c : 'var(--pro-border-hi)'}
        strokeWidth={active ? 1.5 : 1}
      />
      <text
        x="14"
        y="18"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: labelOnly ? 10.5 : 11.5,
          fontWeight: labelOnly ? 600 : 700,
          fill: labelOnly ? 'var(--pro-text-dim)' : c,
          letterSpacing: '0.04em',
          textTransform: labelOnly ? 'uppercase' : 'none',
        }}
      >
        {chip}
      </text>
      {desc && (
        <text
          x={14 + chipPx + 8}
          y="18"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: labelOnly ? 10.5 : 9.5,
            fontWeight: labelOnly ? 600 : 400,
            fill: 'var(--pro-text-dim)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          · {desc}
        </text>
      )}
    </g>
  );
}

interface BoxActorProps {
  box: { x: number; y: number; w: number; h: number; label: string; sub: string };
  tone: 'info' | 'mint' | 'apricot';
  icon: 'user' | 'layers' | 'link' | 'server';
  identityStrip?: { x: number; y: number; w: number; h: number };
  identityActive?: boolean;
  onIdentityClick?: () => void;
}

const ICON_PATHS = {
  user: 'M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 18l9 5 9-5',
  link: 'M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5',
  server: 'M4 4h16v6H4zM4 14h16v6H4zM7 7h.01M7 17h.01',
};

function BoxActor({ box, tone, icon, identityStrip, identityActive, onIdentityClick }: BoxActorProps) {
  const colors = { info: '#6aa9ee', mint: '#34d3b1', apricot: '#f0a878' } as const;
  const c = colors[tone];
  const headerH = identityStrip ? 74 : box.h;
  const iconCy = box.y + headerH / 2;
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="14" fill="#0c0d13" stroke={c} strokeWidth="1.5" />
      <circle cx={box.x + 38} cy={iconCy} r="20" fill="rgba(52,211,177,0.06)" stroke={c} strokeWidth="1" />
      <g
        transform={`translate(${box.x + 26} ${iconCy - 12})`}
        stroke={c}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ICON_PATHS[icon]} />
      </g>
      <text
        x={box.x + 70}
        y={iconCy - 2}
        style={{ fontSize: 17, fontWeight: 600, fill: 'var(--pro-text)', letterSpacing: '-0.01em' }}
      >
        {box.label}
      </text>
      <text
        x={box.x + 70}
        y={iconCy + 18}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--pro-text-dim)', letterSpacing: '0.02em' }}
      >
        {box.sub}
      </text>

      {identityStrip && (
        <g style={{ cursor: 'pointer' }} onClick={onIdentityClick}>
          <rect
            x={identityStrip.x}
            y={identityStrip.y}
            width={identityStrip.w}
            height={identityStrip.h}
            rx="8"
            fill={identityActive ? 'rgba(52,211,177,0.10)' : 'rgba(52,211,177,0.04)'}
            stroke={identityActive ? '#34d3b1' : '#3a8a76'}
            strokeWidth={identityActive ? 1.5 : 1}
          />
          <text
            x={identityStrip.x + identityStrip.w / 2}
            y={identityStrip.y + 22}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fill: '#34d3b1', letterSpacing: '0.06em', fontWeight: 700 }}
          >
            ERC-8004
          </text>
          <text
            x={identityStrip.x + identityStrip.w / 2}
            y={identityStrip.y + 40}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--pro-text-dim)', letterSpacing: '0.04em' }}
          >
            Identity · Reputation
          </text>
        </g>
      )}
    </g>
  );
}

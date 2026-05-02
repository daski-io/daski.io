import { Icon, type IconName } from './Icon';

type Tone = 'mint' | 'apricot' | 'neutral';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface IconTileProps {
  name: IconName;
  size?: Size;
  tone?: Tone;
}

const SIZES: Record<Size, { box: number; radius: number; icon: number }> = {
  sm: { box: 28, radius: 7, icon: 14 },
  md: { box: 32, radius: 8, icon: 15 },
  lg: { box: 40, radius: 10, icon: 18 },
  xl: { box: 44, radius: 10, icon: 22 },
};

const TONES: Record<Tone, { bg: string; bd: string; fg: string }> = {
  mint:    { bg: 'rgba(52,211,177,0.08)',   bd: 'var(--mint-700)',         fg: 'var(--mint-400)' },
  apricot: { bg: 'rgba(240,168,120,0.10)',  bd: 'rgba(240,168,120,0.35)',  fg: '#f0a878' },
  neutral: { bg: 'var(--pro-surface2)',     bd: 'var(--pro-border)',       fg: 'var(--pro-text-dim)' },
};

export function IconTile({ name, size = 'md', tone = 'mint' }: IconTileProps) {
  const sz = SIZES[size];
  const tn = TONES[tone];
  return (
    <div
      style={{
        width: sz.box,
        height: sz.box,
        borderRadius: sz.radius,
        background: tn.bg,
        border: `1px solid ${tn.bd}`,
        color: tn.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon name={name} size={sz.icon} />
    </div>
  );
}

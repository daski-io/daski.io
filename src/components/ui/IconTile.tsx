import { Icon, type IconName } from './Icon';

type Size = 'sm' | 'md' | 'lg';

interface IconTileProps {
  name: IconName;
  size?: Size;
}

const SIZES: Record<Size, { box: number; radius: number; icon: number }> = {
  sm: { box: 28, radius: 7, icon: 14 },
  md: { box: 32, radius: 8, icon: 15 },
  lg: { box: 40, radius: 10, icon: 18 },
};

export function IconTile({ name, size = 'md' }: IconTileProps) {
  const sz = SIZES[size];
  return (
    <div
      style={{
        width: sz.box,
        height: sz.box,
        borderRadius: sz.radius,
        background: 'rgba(52,211,177,0.08)',
        border: '1px solid var(--mint-700)',
        color: 'var(--mint-400)',
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

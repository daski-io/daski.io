import { Fragment } from 'react';
import { Icon } from '../ui/Icon';
import { Section } from '../ui/Section';
import { promotionTeaserParts } from '../../lib/promotionPresentation';
import { promotionPath, type PromotionView } from '../../lib/promotionView';

/**
 * One linked strip under the home page hero for the open promotion. Static
 * HTML: the home page renders it only when the server has an open promotion
 * to advertise.
 */
export function PromotionTeaser({ promotion }: { promotion: PromotionView }) {
  return (
    <Section pad="0 32px 40px">
      <a href={promotionPath(promotion)} className="dk-card dk-promo-teaser" style={stripStyle}>
        <span style={nameStyle}>
          <span
            aria-hidden="true"
            className={promotion.status === 'active' ? 'dk-pulse-dot' : undefined}
            style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }}
          />
          {promotion.name}
        </span>
        <span style={partsStyle}>
          {promotionTeaserParts(promotion).map((part, index) => (
            <Fragment key={part}>
              {index > 0 && <span aria-hidden="true" style={separatorStyle}>·</span>}
              <span>{part}</span>
            </Fragment>
          ))}
        </span>
        <span style={ctaStyle}>
          See promotion <Icon name="arrow" size={13} />
        </span>
      </a>
    </Section>
  );
}

const stripStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px 18px',
  flexWrap: 'wrap',
  padding: '16px 20px',
  color: 'inherit',
  textDecoration: 'none',
  background: 'linear-gradient(90deg, rgba(52,211,177,0.08), transparent 60%)',
} as const;
const nameStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--mint-400)', fontWeight: 600, fontSize: 15 } as const;
const partsStyle = { display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', color: 'var(--pro-text)', fontSize: 15 } as const;
const separatorStyle = { color: 'var(--pro-text-dim)', opacity: 0.6 } as const;
const ctaStyle = { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--mint-400)', fontSize: 14, fontWeight: 500 } as const;

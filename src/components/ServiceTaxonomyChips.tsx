import type { CSSProperties } from 'react';
import {
  categoryFamilyConfig,
  type CategoryFamily,
} from '../config/service-taxonomy';

interface ServiceTaxonomyChipsProps {
  categoryFamily: CategoryFamily;
  serviceType: string;
  style?: CSSProperties;
}

export function ServiceTaxonomyChips({
  categoryFamily,
  serviceType,
  style,
}: ServiceTaxonomyChipsProps) {
  const family = categoryFamilyConfig(categoryFamily);

  return (
    <div className="dk-taxonomy-chips" style={style}>
      <span
        className="dk-taxonomy-chip"
        style={{ color: family.color }}
        title="Category family"
      >
        {family.label}
      </span>
      <span className="dk-taxonomy-chip" title="Service type">
        {serviceType}
      </span>
    </div>
  );
}

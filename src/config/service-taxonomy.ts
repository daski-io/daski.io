import type { IconName } from '../components/ui/Icon';

export interface CategoryFamilyConfig {
  slug: string;
  label: string;
  icon: IconName;
  color: string;
}

export const SERVICE_CATEGORY_FAMILIES = [
  {
    slug: 'business-formation',
    label: 'Business Formation',
    icon: 'layers',
    color: 'var(--mint-400)',
  },
  {
    slug: 'legal-ip',
    label: 'Legal & Intellectual Property',
    icon: 'legal',
    color: '#f0a878',
  },
  {
    slug: 'compliance',
    label: 'Compliance, Identity & Trust',
    icon: 'check',
    color: '#9fcf8b',
  },
  { slug: 'finance', label: 'Finance', icon: 'dollar', color: '#e7b34a' },
  {
    slug: 'domains-web',
    label: 'Domains & Web',
    icon: 'domain',
    color: 'var(--mint-400)',
  },
  {
    slug: 'communications',
    label: 'Communications',
    icon: 'mail',
    color: '#e7b34a',
  },
  {
    slug: 'compute-ai',
    label: 'Compute & AI',
    icon: 'server',
    color: '#6aa9ee',
  },
  { slug: 'data', label: 'Data', icon: 'layers', color: '#79bfe8' },
  {
    slug: 'software-dev',
    label: 'Software Development',
    icon: 'code',
    color: '#a99bea',
  },
  {
    slug: 'design-creative',
    label: 'Design & Creative',
    icon: 'spark',
    color: '#e99ac7',
  },
  {
    slug: 'marketing-growth',
    label: 'Marketing & Growth',
    icon: 'bolt',
    color: '#ef8f70',
  },
  {
    slug: 'sales-support',
    label: 'Sales & Support',
    icon: 'user',
    color: '#72c7ab',
  },
  {
    slug: 'human-talent',
    label: 'Human Talent',
    icon: 'user',
    color: '#c4a7e7',
  },
  {
    slug: 'operations-admin',
    label: 'Operations & Administration',
    icon: 'file',
    color: '#9da9bd',
  },
  {
    slug: 'logistics-physical',
    label: 'Logistics & Physical Services',
    icon: 'plug',
    color: '#d49b6a',
  },
  {
    slug: 'other',
    label: 'Other & Emerging',
    icon: 'layers',
    color: '#9da9bd',
  },
] as const satisfies readonly CategoryFamilyConfig[];

export type CategoryFamily = string;
export type CategoryFamilyFilter = string;

const CATEGORY_FAMILY_BY_SLUG = new Map<string, CategoryFamilyConfig>(
  SERVICE_CATEGORY_FAMILIES.map((family) => [family.slug, family]),
);

function labelFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function categoryFamilyConfig(
  categoryFamily: string,
): CategoryFamilyConfig {
  return CATEGORY_FAMILY_BY_SLUG.get(categoryFamily) ?? {
    slug: categoryFamily,
    label: labelFromSlug(categoryFamily),
    icon: 'layers',
    color: '#9da9bd',
  };
}

export function populatedCategoryFamilies(
  services: readonly { categoryFamily: string }[],
): (CategoryFamilyConfig & { count: number })[] {
  const counts = new Map<string, number>();
  for (const service of services) {
    counts.set(service.categoryFamily, (counts.get(service.categoryFamily) ?? 0) + 1);
  }
  const recommended = SERVICE_CATEGORY_FAMILIES
    .filter((family) => counts.has(family.slug))
    .map((family) => ({ ...family, count: counts.get(family.slug)! }));
  const known = new Set<string>(SERVICE_CATEGORY_FAMILIES.map((family) => family.slug));
  const emerging = [...counts]
    .filter(([slug]) => !known.has(slug))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slug, count]) => ({ ...categoryFamilyConfig(slug), count }));
  return [...recommended, ...emerging];
}

export function filterServicesByCategory<
  T extends { categoryFamily: string },
>(services: readonly T[], filter: CategoryFamilyFilter): T[] {
  return filter === 'all'
    ? [...services]
    : services.filter((service) => service.categoryFamily === filter);
}

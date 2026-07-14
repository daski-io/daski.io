import type { IconName } from '../components/ui/Icon';

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
] as const satisfies readonly {
  slug: string;
  label: string;
  icon: IconName;
  color: string;
}[];

export type CategoryFamily = (typeof SERVICE_CATEGORY_FAMILIES)[number]['slug'];
export type CategoryFamilyConfig = (typeof SERVICE_CATEGORY_FAMILIES)[number];
export type CategoryFamilyFilter = 'all' | CategoryFamily;

const CATEGORY_FAMILY_BY_SLUG = Object.fromEntries(
  SERVICE_CATEGORY_FAMILIES.map((family) => [family.slug, family]),
) as Record<CategoryFamily, CategoryFamilyConfig>;

export function categoryFamilyConfig(
  categoryFamily: CategoryFamily,
): CategoryFamilyConfig {
  return CATEGORY_FAMILY_BY_SLUG[categoryFamily];
}

export function populatedCategoryFamilies(
  services: readonly { categoryFamily: CategoryFamily }[],
): (CategoryFamilyConfig & { count: number })[] {
  return SERVICE_CATEGORY_FAMILIES.map((family) => ({
    ...family,
    count: services.filter((service) => service.categoryFamily === family.slug)
      .length,
  })).filter((family) => family.count > 0);
}

export function filterServicesByCategory<
  T extends { categoryFamily: CategoryFamily },
>(services: readonly T[], filter: CategoryFamilyFilter): T[] {
  return filter === 'all'
    ? [...services]
    : services.filter((service) => service.categoryFamily === filter);
}

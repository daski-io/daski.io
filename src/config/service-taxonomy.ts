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

/**
 * The controlled service types of each category family, by id, with the
 * label the marketplace shows. A family's own fallback, `<family>-other`
 * (`other` for the family `other`), is listed too; it is not shown as a
 * chip, since it says nothing the category does not.
 */
export const SERVICE_TYPES: Readonly<Record<string, { family: string; label: string }>> = {
  // business-formation
  'entity-formation': { family: 'business-formation', label: 'Entity formation' },
  'registered-agent': { family: 'business-formation', label: 'Registered agent' },
  'ein-tax-id': { family: 'business-formation', label: 'Tax ID registration' },
  'annual-report-filing': { family: 'business-formation', label: 'Annual report filing' },
  'company-amendment': { family: 'business-formation', label: 'Company amendment' },
  'foreign-qualification': { family: 'business-formation', label: 'Foreign qualification' },
  'business-license': { family: 'business-formation', label: 'Business license' },
  'company-dissolution': { family: 'business-formation', label: 'Company dissolution' },
  'virtual-office': { family: 'business-formation', label: 'Virtual office' },
  'business-formation-other': { family: 'business-formation', label: 'Other' },
  // legal-ip
  'contract-drafting': { family: 'legal-ip', label: 'Contract drafting' },
  'contract-review': { family: 'legal-ip', label: 'Contract review' },
  'trademark-search': { family: 'legal-ip', label: 'Trademark search' },
  'trademark-filing': { family: 'legal-ip', label: 'Trademark filing' },
  'patent-search': { family: 'legal-ip', label: 'Patent search' },
  'patent-filing': { family: 'legal-ip', label: 'Patent filing' },
  'copyright-registration': { family: 'legal-ip', label: 'Copyright registration' },
  'legal-document-preparation': { family: 'legal-ip', label: 'Legal document preparation' },
  'legal-research': { family: 'legal-ip', label: 'Legal research' },
  'notarization': { family: 'legal-ip', label: 'Notarization' },
  'legal-ip-other': { family: 'legal-ip', label: 'Other' },
  // compliance
  'kyc-verification': { family: 'compliance', label: 'Identity verification' },
  'kyb-verification': { family: 'compliance', label: 'Business verification' },
  'sanctions-screening': { family: 'compliance', label: 'Sanctions screening' },
  'background-check': { family: 'compliance', label: 'Background check' },
  'regulatory-filing': { family: 'compliance', label: 'Regulatory filing' },
  'privacy-compliance': { family: 'compliance', label: 'Privacy compliance' },
  'security-audit': { family: 'compliance', label: 'Security audit' },
  'accessibility-audit': { family: 'compliance', label: 'Accessibility audit' },
  'compliance-other': { family: 'compliance', label: 'Other' },
  // finance
  'bookkeeping': { family: 'finance', label: 'Bookkeeping' },
  'tax-preparation': { family: 'finance', label: 'Tax preparation' },
  'sales-tax-filing': { family: 'finance', label: 'Sales tax filing' },
  'payroll': { family: 'finance', label: 'Payroll' },
  'invoicing-collections': { family: 'finance', label: 'Invoicing and collections' },
  'financial-statements': { family: 'finance', label: 'Financial statements' },
  'financial-modeling': { family: 'finance', label: 'Financial modeling' },
  'audit-assurance': { family: 'finance', label: 'Audit and assurance' },
  'insurance-quote': { family: 'finance', label: 'Insurance quote' },
  'finance-other': { family: 'finance', label: 'Other' },
  // domains-web
  'domain-management': { family: 'domains-web', label: 'Domain management' },
  'server-hosting': { family: 'domains-web', label: 'Server hosting' },
  'web-hosting': { family: 'domains-web', label: 'Web hosting' },
  'ssl-certificate': { family: 'domains-web', label: 'SSL certificate' },
  'website-build': { family: 'domains-web', label: 'Website build' },
  'website-maintenance': { family: 'domains-web', label: 'Website maintenance' },
  'cdn-setup': { family: 'domains-web', label: 'CDN setup' },
  'domains-web-other': { family: 'domains-web', label: 'Other' },
  // communications
  'agent-mailbox': { family: 'communications', label: 'Agent mailbox' },
  'email-hosting': { family: 'communications', label: 'Email hosting' },
  'phone-number': { family: 'communications', label: 'Phone number' },
  'sms-messaging': { family: 'communications', label: 'SMS messaging' },
  'transactional-email': { family: 'communications', label: 'Transactional email' },
  'physical-mail': { family: 'communications', label: 'Physical mail' },
  'fax': { family: 'communications', label: 'Fax' },
  'translation': { family: 'communications', label: 'Translation' },
  'transcription': { family: 'communications', label: 'Transcription' },
  'communications-other': { family: 'communications', label: 'Other' },
  // compute-ai
  'ai-inference': { family: 'compute-ai', label: 'AI inference' },
  'gpu-compute': { family: 'compute-ai', label: 'GPU compute' },
  'model-fine-tuning': { family: 'compute-ai', label: 'Model fine-tuning' },
  'ai-agent-build': { family: 'compute-ai', label: 'AI agent build' },
  'data-labeling': { family: 'compute-ai', label: 'Data labeling' },
  'ai-evaluation': { family: 'compute-ai', label: 'AI evaluation' },
  'workflow-automation': { family: 'compute-ai', label: 'Workflow automation' },
  'compute-ai-other': { family: 'compute-ai', label: 'Other' },
  // data
  'web-research': { family: 'data', label: 'Web research' },
  'data-scraping': { family: 'data', label: 'Data scraping' },
  'lead-list': { family: 'data', label: 'Lead list' },
  'data-enrichment': { family: 'data', label: 'Data enrichment' },
  'data-cleaning': { family: 'data', label: 'Data cleaning' },
  'data-analysis': { family: 'data', label: 'Data analysis' },
  'dataset': { family: 'data', label: 'Dataset' },
  'market-research': { family: 'data', label: 'Market research' },
  'data-other': { family: 'data', label: 'Other' },
  // software-dev
  'feature-development': { family: 'software-dev', label: 'Feature development' },
  'bug-fix': { family: 'software-dev', label: 'Bug fix' },
  'code-review': { family: 'software-dev', label: 'Code review' },
  'api-integration': { family: 'software-dev', label: 'API integration' },
  'mobile-app': { family: 'software-dev', label: 'Mobile app' },
  'smart-contract': { family: 'software-dev', label: 'Smart contract' },
  'smart-contract-audit': { family: 'software-dev', label: 'Smart contract audit' },
  'qa-testing': { family: 'software-dev', label: 'QA testing' },
  'devops': { family: 'software-dev', label: 'DevOps' },
  'software-dev-other': { family: 'software-dev', label: 'Other' },
  // design-creative
  'logo-design': { family: 'design-creative', label: 'Logo design' },
  'brand-identity': { family: 'design-creative', label: 'Brand identity' },
  'graphic-design': { family: 'design-creative', label: 'Graphic design' },
  'ui-ux-design': { family: 'design-creative', label: 'UI/UX design' },
  'illustration': { family: 'design-creative', label: 'Illustration' },
  'photography': { family: 'design-creative', label: 'Photography' },
  'video-production': { family: 'design-creative', label: 'Video production' },
  'animation': { family: 'design-creative', label: 'Animation' },
  'copywriting': { family: 'design-creative', label: 'Copywriting' },
  'content-writing': { family: 'design-creative', label: 'Content writing' },
  'voice-over': { family: 'design-creative', label: 'Voice-over' },
  'design-creative-other': { family: 'design-creative', label: 'Other' },
  // marketing-growth
  'seo': { family: 'marketing-growth', label: 'SEO' },
  'paid-ads': { family: 'marketing-growth', label: 'Paid ads' },
  'social-media-management': { family: 'marketing-growth', label: 'Social media management' },
  'email-marketing': { family: 'marketing-growth', label: 'Email marketing' },
  'public-relations': { family: 'marketing-growth', label: 'Public relations' },
  'media-outreach': { family: 'marketing-growth', label: 'Media outreach' },
  'influencer-marketing': { family: 'marketing-growth', label: 'Influencer marketing' },
  'content-marketing': { family: 'marketing-growth', label: 'Content marketing' },
  'app-store-optimization': { family: 'marketing-growth', label: 'App store optimization' },
  'reviews-reputation': { family: 'marketing-growth', label: 'Reviews and reputation' },
  'marketing-growth-other': { family: 'marketing-growth', label: 'Other' },
  // sales-support
  'lead-generation': { family: 'sales-support', label: 'Lead generation' },
  'appointment-setting': { family: 'sales-support', label: 'Appointment setting' },
  'outbound-outreach': { family: 'sales-support', label: 'Outbound outreach' },
  'crm-setup': { family: 'sales-support', label: 'CRM setup' },
  'customer-support': { family: 'sales-support', label: 'Customer support' },
  'call-answering': { family: 'sales-support', label: 'Call answering' },
  'sales-support-other': { family: 'sales-support', label: 'Other' },
  // human-talent
  'recruiting': { family: 'human-talent', label: 'Recruiting' },
  'virtual-assistant': { family: 'human-talent', label: 'Virtual assistant' },
  'expert-consultation': { family: 'human-talent', label: 'Expert consultation' },
  'tutoring-training': { family: 'human-talent', label: 'Tutoring and training' },
  'freelance-staffing': { family: 'human-talent', label: 'Freelance staffing' },
  'human-talent-other': { family: 'human-talent', label: 'Other' },
  // operations-admin
  'data-entry': { family: 'operations-admin', label: 'Data entry' },
  'document-processing': { family: 'operations-admin', label: 'Document processing' },
  'scheduling': { family: 'operations-admin', label: 'Scheduling' },
  'procurement': { family: 'operations-admin', label: 'Procurement' },
  'vendor-management': { family: 'operations-admin', label: 'Vendor management' },
  'research-assistance': { family: 'operations-admin', label: 'Research assistance' },
  'operations-admin-other': { family: 'operations-admin', label: 'Other' },
  // logistics-physical
  'shipping': { family: 'logistics-physical', label: 'Shipping' },
  'courier-delivery': { family: 'logistics-physical', label: 'Courier delivery' },
  'warehousing-fulfillment': { family: 'logistics-physical', label: 'Warehousing and fulfillment' },
  'printing': { family: 'logistics-physical', label: 'Printing' },
  'field-service': { family: 'logistics-physical', label: 'Field service' },
  'inspection': { family: 'logistics-physical', label: 'Inspection' },
  'errands': { family: 'logistics-physical', label: 'Errands' },
  'logistics-physical-other': { family: 'logistics-physical', label: 'Other' },
  // other
  'question-answering': { family: 'other', label: 'Question answering' },
  'other': { family: 'other', label: 'Other' },
};

/** Whether a service type is its family's fallback: `<family>-other`, or `other`. */
export function isFallbackServiceType(serviceType: string): boolean {
  return serviceType === 'other' || serviceType.endsWith('-other');
}

/** The label of a service type: the controlled list's, or a readable form of an id it does not list. */
export function serviceTypeLabel(serviceType: string): string {
  return SERVICE_TYPES[serviceType]?.label ?? labelFromSlug(serviceType);
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

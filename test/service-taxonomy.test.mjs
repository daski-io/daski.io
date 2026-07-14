import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SERVICE_CATEGORY_FAMILIES,
  filterServicesByCategory,
  populatedCategoryFamilies,
} from '../src/config/service-taxonomy.ts';

const EXPECTED_FAMILY_SLUGS = [
  'business-formation',
  'legal-ip',
  'compliance',
  'finance',
  'domains-web',
  'communications',
  'compute-ai',
  'data',
  'software-dev',
  'design-creative',
  'marketing-growth',
  'sales-support',
  'human-talent',
  'operations-admin',
  'logistics-physical',
  'other',
];

test('publishes the canonical category families in approved browse order', () => {
  assert.deepEqual(
    SERVICE_CATEGORY_FAMILIES.map((family) => family.slug),
    EXPECTED_FAMILY_SLUGS,
  );
  assert.equal(new Set(EXPECTED_FAMILY_SLUGS).size, 16);
});

test('returns only populated families with live service counts', () => {
  const services = [
    { id: 'mailbox', categoryFamily: 'communications' },
    { id: 'domain-registration', categoryFamily: 'domains-web' },
    { id: 'domain-transfer', categoryFamily: 'domains-web' },
  ];

  assert.deepEqual(
    populatedCategoryFamilies(services).map(({ slug, label, count }) => ({
      slug,
      label,
      count,
    })),
    [
      { slug: 'domains-web', label: 'Domains & Web', count: 2 },
      { slug: 'communications', label: 'Communications', count: 1 },
    ],
  );
});

test('filters services by category family', () => {
  const services = [
    { id: 'mailbox', categoryFamily: 'communications' },
    { id: 'domain-registration', categoryFamily: 'domains-web' },
  ];

  assert.deepEqual(filterServicesByCategory(services, 'communications'), [
    services[0],
  ]);
  assert.deepEqual(filterServicesByCategory(services, 'all'), services);
});

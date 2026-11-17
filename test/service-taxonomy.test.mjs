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

test('keeps previously unseen provider categories discoverable', () => {
  const services = [
    { id: 'domain-registration', categoryFamily: 'domains-web' },
    { id: 'lab-analysis', categoryFamily: 'scientific-services' },
  ];

  assert.deepEqual(
    populatedCategoryFamilies(services).map(({ slug, label, count }) => ({
      slug,
      label,
      count,
    })),
    [
      { slug: 'domains-web', label: 'Domains & Web', count: 1 },
      {
        slug: 'scientific-services',
        label: 'Scientific Services',
        count: 1,
      },
    ],
  );
});

test('service types carry the controlled labels, one family each, and every family has its fallback', async () => {
  const { SERVICE_TYPES, SERVICE_CATEGORY_FAMILIES, serviceTypeLabel, isFallbackServiceType } =
    await import('../src/config/service-taxonomy.ts');
  assert.equal(serviceTypeLabel('public-relations'), 'Public relations');
  assert.equal(serviceTypeLabel('entity-formation'), 'Entity formation');
  assert.equal(SERVICE_TYPES['press-release'], undefined);
  // An id the list does not hold reads as words.
  assert.equal(serviceTypeLabel('custom-widget-build'), 'Custom Widget Build');
  const families = new Set(SERVICE_CATEGORY_FAMILIES.map((family) => family.slug));
  for (const [id, type] of Object.entries(SERVICE_TYPES)) {
    assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, id);
    assert.ok(families.has(type.family), `${id} names a known family`);
  }
  for (const family of families) {
    const fallback = family === 'other' ? 'other' : `${family}-other`;
    assert.equal(SERVICE_TYPES[fallback]?.family, family, fallback);
    assert.equal(isFallbackServiceType(fallback), true);
  }
  for (const live of ['entity-formation', 'domain-management', 'server-hosting', 'agent-mailbox', 'ai-inference']) {
    assert.equal(isFallbackServiceType(live), false, live);
    assert.ok(SERVICE_TYPES[live], live);
  }
});

import { describe, expect, it } from 'vitest';
import {
  AGENCY_METRICS,
  BUDGET_TIERS,
  CASE_STUDIES,
  CHANNEL_OPTIONS,
  FAQ_ITEMS,
  SERVICE_PILLARS,
} from '../src/data/agency';
import { filterCaseStudies } from '../src/scripts/work';

describe('Agency data & case study filtering', () => {
  it('provides complete agency metrics, services, FAQs, and form choices', () => {
    expect(AGENCY_METRICS).toHaveLength(4);
    expect(SERVICE_PILLARS).toHaveLength(4);
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(4);
    expect(BUDGET_TIERS.length).toBeGreaterThanOrEqual(2);
    expect(BUDGET_TIERS.length).toBeLessThanOrEqual(5);
    expect(CHANNEL_OPTIONS.length).toBeGreaterThanOrEqual(3);
  });

  it('ensures every case study has unique IDs and non-empty deliverables', () => {
    const ids = new Set(CASE_STUDIES.map((c) => c.id));
    expect(ids.size).toBe(CASE_STUDIES.length);
    for (const study of CASE_STUDIES) {
      expect(study.client.length).toBeGreaterThan(0);
      expect(study.deliverables.length).toBeGreaterThan(0);
    }
  });

  it('filters case studies by channel discipline', () => {
    expect(filterCaseStudies(CASE_STUDIES, 'all')).toHaveLength(CASE_STUDIES.length);
    const creators = filterCaseStudies(CASE_STUDIES, 'creators');
    expect(creators.length).toBeGreaterThan(0);
    expect(creators.every((c) => c.channel === 'creators')).toBe(true);

    const paid = filterCaseStudies(CASE_STUDIES, 'paid-social');
    expect(paid).toHaveLength(1);
    expect(paid[0].id).toBe('solstice-matcha');
  });
});


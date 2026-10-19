import { describe, expect, it } from 'vitest';
import { planTotalSec } from '../domain/timer';
import { PLANS } from './plans';

describe('hardcoded plans', () => {
  it('have the agreed totals', () => {
    expect(PLANS.map((p) => planTotalSec(p) / 60)).toEqual([25, 47, 61]);
  });

  it('have unique ids', () => {
    const planIds = PLANS.map((p) => p.id);
    expect(new Set(planIds).size).toBe(planIds.length);
    const sectionIds = PLANS.flatMap((p) => p.sections.map((s) => s.id));
    expect(new Set(sectionIds).size).toBe(sectionIds.length);
  });
});

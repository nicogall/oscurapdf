import { describe, expect, it } from 'vitest';
import { findDrops } from './compare';

const totals = (pct: number, branches = pct) => ({
  lines: { pct },
  branches: { pct: branches },
  functions: { pct },
  statements: { pct },
});

describe('coverage-guard findDrops', () => {
  it('reports no drop when coverage is equal or higher', () => {
    expect(findDrops(totals(90), totals(90))).toEqual([]);
    expect(findDrops(totals(90), totals(95))).toEqual([]);
  });

  it('reports each metric that decreased', () => {
    expect(findDrops(totals(90), totals(90, 85))).toEqual([{ metric: 'branches', baseline: 90, current: 85 }]);
  });
});

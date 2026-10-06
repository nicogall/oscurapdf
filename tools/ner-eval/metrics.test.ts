import { describe, expect, it } from 'vitest';
import { isFound, recallRate, tierOf } from './metrics';

const TEXT = 'Mario Rossi lives in Milano';

describe('ner-eval metrics', () => {
  it('an entity is found when all its non-space characters are covered, by one or several spans', () => {
    const mario = { start: 0, end: 11, category: 'PERSON' as const };
    expect(isFound(TEXT, mario, [{ start: 0, end: 11 }])).toBe(true);
    expect(isFound(TEXT, mario, [{ start: 0, end: 5 }, { start: 6, end: 11 }])).toBe(true);
    expect(isFound(TEXT, mario, [{ start: 0, end: 5 }])).toBe(false);
  });

  it('recall of an empty set is 1', () => {
    expect(recallRate({ found: 0, total: 0 })).toBe(1);
    expect(recallRate({ found: 9, total: 10 })).toBe(0.9);
  });

  it('classifies the tiers: precision of preselected items first, then PERSON recall', () => {
    expect(tierOf(0.96, 0.97)).toBe('target');
    expect(tierOf(0.9, 0.97)).toBe('acceptedMinimum');
    expect(tierOf(0.84, 0.99)).toBe('fail');
    expect(tierOf(1, 0.94)).toBe('fail');
  });
});

import { describe, expect, it } from 'vitest';
import { PII_CATEGORIES, createDetectionCandidate, createPlannedArea } from '@shared-kernel/published';

const text = 'Mario Rossi   lives here';

describe('DetectionCandidate', () => {
  it('covers at least one non-whitespace character', () => {
    const ok = createDetectionCandidate(text, {
      category: 'PERSON',
      range: { start: 0, end: 11 },
      confidence: 'high',
      method: 'ner',
    });
    expect(ok.ok).toBe(true);
    const blank = createDetectionCandidate(text, {
      category: 'PERSON',
      range: { start: 11, end: 14 },
      confidence: 'low',
      method: 'rule',
    });
    expect(blank).toEqual({ ok: false, error: 'blankCandidate' });
  });

  it('rejects ranges outside the text', () => {
    const out = createDetectionCandidate(text, {
      category: 'EMAIL',
      range: { start: 20, end: 99 },
      confidence: 'high',
      method: 'rule',
    });
    expect(out).toEqual({ ok: false, error: 'rangeOutOfText' });
  });

  it('defines exactly the 13 categories', () => {
    expect(PII_CATEGORIES).toHaveLength(13);
  });
});

describe('PlannedArea', () => {
  it('has origin text | area and a valid box', () => {
    const area = createPlannedArea({ x: 0, y: 0, width: 5, height: 5 }, 'area');
    expect(area.ok && area.value.origin).toBe('area');
    expect(createPlannedArea({ x: 0, y: 0, width: 0, height: 5 }, 'text').ok).toBe(false);
  });
});

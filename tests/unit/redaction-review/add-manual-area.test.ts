import { describe, expect, it } from 'vitest';
import { RedactionReview, validateArea } from '@review';
import { reviewDocument } from '../../support/fakes/document-text';

const A4 = { width: 595, height: 842 };
const area = (x: number, y: number, width: number, height: number) => ({ page: 0 as never, box: { x, y, width, height } });

describe('area validation (US3)', () => {
  it('accepts a box within the page, with sub-point tolerance', () => {
    expect(validateArea(area(0, 0, 595, 842), A4).ok).toBe(true);
    expect(validateArea(area(-0.3, 10, 50, 50), A4).ok).toBe(true);
  });

  it('rejects boxes outside the page or without size', () => {
    expect(validateArea(area(560, 10, 50, 50), A4).ok).toBe(false);
    expect(validateArea(area(10, 830, 50, 50), A4).ok).toBe(false);
    expect(validateArea(area(-5, 10, 50, 50), A4).ok).toBe(false);
    expect(validateArea(area(10, 10, 0, 50), A4).ok).toBe(false);
  });
});

describe('RedactionReview.addManualArea', () => {
  it('adds a MANUAL area redaction; areas never merge; they can be deleted', () => {
    const review = new RedactionReview(reviewDocument());
    const a = review.addManualArea(area(10, 10, 50, 20), A4);
    const b = review.addManualArea(area(10, 10, 50, 20), A4);
    expect(a.ok && b.ok && a.value !== b.value).toBe(true);
    expect(review.store.snapshot().items.map((i) => [i.kind, i.category, i.source])).toEqual([
      ['area', 'MANUAL', 'manual'],
      ['area', 'MANUAL', 'manual'],
    ]);
    if (a.ok) expect(review.delete(a.value).ok).toBe(true);
    expect(review.store.snapshot().items).toHaveLength(1);
  });

  it('refuses a box outside the page', () => {
    const review = new RedactionReview(reviewDocument());
    expect(review.addManualArea(area(500, 800, 200, 200), A4)).toEqual({ ok: false, error: 'invalidArea' });
    expect(review.store.snapshot().items).toHaveLength(0);
  });
});

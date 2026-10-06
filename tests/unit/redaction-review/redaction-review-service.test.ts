import { describe, expect, it } from 'vitest';
import { RedactionReview } from '@review';
import { rangeOf, reviewDocument } from '../../support/fakes/document-text';

const setup = () => {
  const doc = reviewDocument();
  const review = new RedactionReview(doc);
  const published: number[] = [];
  review.store.subscribe(() => published.push(review.store.snapshot().items.length));
  return { doc, review, published };
};

describe('RedactionReview service', () => {
  it('publishes a snapshot with items and summary after each change', () => {
    const { doc, review, published } = setup();
    const id = review.addManualText(rangeOf(doc, 'John Smith'));
    expect(published).toEqual([1]);
    expect(review.store.snapshot().summary).toEqual({ total: 1, automatic: 0, manual: 1, selected: 1 });
    if (id.ok) review.deselect(id.value);
    expect(review.store.snapshot().summary.selected).toBe(0);
    review.selectAll();
    review.deselectAll();
    if (id.ok) review.select(id.value);
    expect(review.store.snapshot().summary.selected).toBe(1);
  });

  it('does not publish when a command fails', () => {
    const { doc, review, published } = setup();
    const blank = doc.text.indexOf(' ');
    review.addManualText({ start: blank, end: blank + 1 });
    expect(published).toEqual([]);
  });

  it('adds areas, deletes manual items and builds the plan', () => {
    const { review } = setup();
    expect(review.toPlan()).toEqual({ ok: false, error: 'nothingSelected' });
    const area = review.addManualArea({ page: 0 as never, box: { x: 1, y: 1, width: 5, height: 5 } }, { width: 595, height: 842 });
    expect(review.toPlan().ok).toBe(true);
    if (area.ok) expect(review.delete(area.value).ok).toBe(true);
    expect(review.store.snapshot().items).toHaveLength(0);
  });

  it('exposes the export lock in the snapshot', () => {
    const { review } = setup();
    review.setMode('exporting');
    expect(review.store.snapshot().mode).toBe('exporting');
    review.setMode('editing');
    expect(review.store.snapshot().mode).toBe('editing');
  });
});

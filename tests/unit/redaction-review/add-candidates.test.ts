import { describe, expect, it } from 'vitest';
import type { DetectionCandidate } from '@shared-kernel/published';
import { RedactionReview } from '@review';
import { rangeOf, reviewDocument } from '../../support/fakes/document-text';

const candidate = (range: { start: number; end: number }, category: DetectionCandidate['category'], confidence: DetectionCandidate['confidence']): DetectionCandidate => ({
  range,
  category,
  confidence,
  method: 'rule',
});

describe('RedactionReview.addCandidates', () => {
  it('merges candidates with the same normalized text into one redaction with all occurrences', () => {
    const doc = reviewDocument();
    const review = new RedactionReview(doc);
    review.addCandidates([
      candidate(rangeOf(doc, 'ROSSI'), 'PERSON', 'medium'),
      candidate(rangeOf(doc, 'Rossi', 1), 'PERSON', 'high'),
      candidate(rangeOf(doc, 'John Smith'), 'PERSON', 'low'),
    ]);
    const { items, summary } = review.store.snapshot();
    expect(items).toHaveLength(2);
    const rossi = items.find((i) => i.key === 'rossi');
    expect(rossi?.occurrences).toHaveLength(2);
    expect(rossi?.confidence).toBe('high');
    expect(summary).toEqual({ total: 2, automatic: 2, manual: 0, selected: 1 });
  });

  it('publishes a single snapshot for the whole batch', () => {
    const doc = reviewDocument();
    const review = new RedactionReview(doc);
    let publications = 0;
    review.store.subscribe(() => (publications += 1));
    review.addCandidates([candidate(rangeOf(doc, 'John Smith'), 'PERSON', 'high'), candidate(rangeOf(doc, 'ROSSI'), 'PERSON', 'high')]);
    expect(publications).toBe(1);
  });

  it('never downgrades an existing manual redaction', () => {
    const doc = reviewDocument();
    const review = new RedactionReview(doc);
    review.addManualText(rangeOf(doc, 'John Smith'));
    review.addCandidates([candidate(rangeOf(doc, 'John Smith'), 'PERSON', 'low')]);
    expect(review.store.snapshot().items[0]).toMatchObject({ source: 'manual', selected: true, confidence: 'userConfirmed' });
  });
});

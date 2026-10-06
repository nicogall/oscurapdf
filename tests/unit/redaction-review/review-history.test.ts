import { describe, expect, it } from 'vitest';
import type { DetectionCandidate } from '@shared-kernel/published';
import { RedactionReview } from '@review';
import { rangeOf, reviewDocument } from '../../support/fakes/document-text';

const setup = () => {
  const doc = reviewDocument();
  const review = new RedactionReview(doc);
  const texts = () => review.store.snapshot().items.map((i) => `${i.text ?? 'area'}${i.selected ? '' : ' (off)'}`);
  return { doc, review, texts };
};
const person = (range: { start: number; end: number }): DetectionCandidate => ({ range, category: 'PERSON', confidence: 'high', method: 'rule' });

describe('undo / redo of review commands', () => {
  it('undoes and redoes a manual redaction, publishing each time', () => {
    const { doc, review, texts } = setup();
    review.addManualText(rangeOf(doc, 'John Smith'));
    expect(review.store.snapshot().history).toEqual({ canUndo: true, canRedo: false });
    expect(review.history.undo()).toBe(true);
    expect(texts()).toEqual([]);
    expect(review.store.snapshot().history).toEqual({ canUndo: false, canRedo: true });
    expect(review.history.redo()).toBe(true);
    expect(texts()).toEqual(['John Smith']);
  });

  it('undoes select, deselect, bulk changes and deletions one step at a time', () => {
    const { doc, review, texts } = setup();
    const smith = review.addManualText(rangeOf(doc, 'John Smith'));
    review.addManualText(rangeOf(doc, 'ROSSI'));
    review.deselectAll();
    if (smith.ok) review.select(smith.value);
    if (smith.ok) review.delete(smith.value);
    expect(texts()).toEqual(['ROSSI (off)']);
    review.history.undo();
    expect(texts()).toEqual(['John Smith', 'ROSSI (off)']);
    review.history.undo();
    expect(texts()).toEqual(['John Smith (off)', 'ROSSI (off)']);
    review.history.undo();
    expect(texts()).toEqual(['John Smith', 'ROSSI']);
  });

  it('records nothing for a command that changes nothing', () => {
    const { doc, review } = setup();
    const smith = review.addManualText(rangeOf(doc, 'John Smith'));
    review.history.undo();
    review.history.redo();
    if (smith.ok) review.select(smith.value);
    review.history.undo();
    expect(review.store.snapshot().items).toEqual([]);
  });

  it('never undoes automatic detections, even when they arrive between user commands', () => {
    const { doc, review, texts } = setup();
    review.addManualText(rangeOf(doc, 'ROSSI'));
    review.addCandidates([person(rangeOf(doc, 'John Smith'))]);
    review.history.undo();
    expect(texts()).toEqual(['John Smith']);
    expect(review.history.undo()).toBe(false);
  });

  it('is read-only while exporting', () => {
    const { doc, review, texts } = setup();
    review.addManualText(rangeOf(doc, 'John Smith'));
    review.setMode('exporting');
    expect(review.history.undo()).toBe(false);
    expect(texts()).toEqual(['John Smith']);
    review.setMode('editing');
    expect(review.history.undo()).toBe(true);
  });
});

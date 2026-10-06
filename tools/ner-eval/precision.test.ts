import { describe, expect, it } from 'vitest';
import { PRECISION_CORPUS } from './precision-corpus';
import { parseMarked, scorePrecision } from './precision';

describe('precision scoring (SC-006b)', () => {
  it('strips the markers and keeps exact offsets', () => {
    const doc = parseMarked('Nome ⟦Mario⟧, CF ⟦RSSMRA85T10A562S⟧.');
    expect(doc.text).toBe('Nome Mario, CF RSSMRA85T10A562S.');
    expect(doc.pii.map((p) => doc.text.slice(p.start, p.end))).toEqual(['Mario', 'RSSMRA85T10A562S']);
  });

  it('counts correct preselected and shown suggestions, coverage and false positives', () => {
    const doc = parseMarked('Nome ⟦Mario⟧ USA ⟦12345678⟧');
    const score = scorePrecision(doc, [
      { start: 5, end: 10, confidence: 'high' },
      { start: 11, end: 14, confidence: 'medium' },
    ]);
    expect(score.preselected).toEqual({ correct: 1, total: 1 });
    expect(score.shown).toEqual({ correct: 1, total: 2 });
    expect(score.covered).toEqual({ found: 1, total: 2 });
    expect(score.falsePositives).toEqual(['USA (medium)']);
  });

  it('expands each suggested text to all its occurrences, with the best confidence (like the review)', () => {
    const doc = parseMarked('⟦Rossi⟧ e ⟦ROSSI⟧, non Rossini');
    const score = scorePrecision(doc, [{ start: 0, end: 5, confidence: 'medium' }, { start: 8, end: 13, confidence: 'high' }]);
    expect(score.preselected).toEqual({ correct: 2, total: 2 });
    expect(score.covered).toEqual({ found: 2, total: 2 });
  });

  it('every corpus document has balanced markers, and one has no personal data at all', () => {
    for (const { marked } of PRECISION_CORPUS) expect(marked.split('⟦').length).toBe(marked.split('⟧').length);
    expect(PRECISION_CORPUS.some(({ marked }) => parseMarked(marked).pii.length === 0)).toBe(true);
  });
});

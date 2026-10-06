import { describe, expect, it } from 'vitest';
import type { DetectionCandidate } from '@shared-kernel/published';
import { mergeCandidates } from '../../../src/contexts/detection/domain/candidate-merging';

const c = (start: number, end: number, confidence: DetectionCandidate['confidence'], category: DetectionCandidate['category'] = 'PHONE'): DetectionCandidate => ({
  category,
  range: { start, end },
  confidence,
  method: 'rule',
});

describe('candidate merging', () => {
  it('keeps non-overlapping candidates in document order', () => {
    expect(mergeCandidates([c(10, 12, 'low'), c(0, 5, 'high')])).toEqual([c(0, 5, 'high'), c(10, 12, 'low')]);
  });

  it('the higher confidence wins', () => {
    expect(mergeCandidates([c(0, 10, 'medium'), c(2, 6, 'high', 'PAYMENT_CARD')])).toEqual([c(2, 6, 'high', 'PAYMENT_CARD')]);
  });

  it('if the confidence is equal, the longer span wins', () => {
    expect(mergeCandidates([c(0, 5, 'high'), c(0, 9, 'high', 'IBAN')])).toEqual([c(0, 9, 'high', 'IBAN')]);
  });

  it('on an exact tie, a specific category beats the generic identifier', () => {
    expect(mergeCandidates([c(0, 9, 'high', 'CONTEXTUAL_ID'), c(0, 9, 'high', 'PAYMENT_CARD')])).toEqual([c(0, 9, 'high', 'PAYMENT_CARD')]);
    expect(mergeCandidates([c(0, 9, 'high', 'PAYMENT_CARD'), c(0, 9, 'high', 'CONTEXTUAL_ID')])).toEqual([c(0, 9, 'high', 'PAYMENT_CARD')]);
  });

  it('at equal confidence, personal data is kept whole against a longer organization', () => {
    expect(mergeCandidates([c(0, 26, 'high', 'ORGANIZATION'), c(15, 26, 'high', 'PERSON')])).toEqual([c(15, 26, 'high', 'PERSON')]);
    expect(mergeCandidates([c(0, 26, 'high', 'ORGANIZATION'), c(15, 26, 'medium', 'PERSON')])).toEqual([c(0, 26, 'high', 'ORGANIZATION')]);
  });

  it('touching ranges do not overlap', () => {
    expect(mergeCandidates([c(0, 5, 'high'), c(5, 9, 'high')])).toHaveLength(2);
  });
});

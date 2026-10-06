import { createDetectionCandidate, type ConfidenceLevel, type DetectionCandidate, type PiiCategory } from '@shared-kernel/published';
import type { CharRange } from '@shared-kernel';
import type { DetectionInput } from '../detector';

/**
 * Some rules need capitalisation, which the shared normalization folds away, so they match the
 * original text directly (offsets are already original).
 */
export const originalCandidate = (input: DetectionInput, range: CharRange, category: PiiCategory, confidence: ConfidenceLevel): DetectionCandidate[] => {
  const candidate = createDetectionCandidate(input.text, { category, range, confidence, method: 'rule' });
  return candidate.ok ? [candidate.value] : [];
};

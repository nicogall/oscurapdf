import type { CharRange } from '../char-range';
import { err, ok, type Result } from '../result';
import type { ConfidenceLevel } from './confidence-level';
import type { DetectionMethod } from './detection-method';
import type { PiiCategory } from './pii-category';

/** An automatic finding, before it becomes a Redaction (published language: Detection → Review). */
export interface DetectionCandidate {
  readonly category: PiiCategory;
  readonly range: CharRange;
  readonly confidence: ConfidenceLevel;
  readonly method: DetectionMethod;
}

export type CandidateError = 'rangeOutOfText' | 'blankCandidate';

export const createDetectionCandidate = (
  text: string,
  candidate: DetectionCandidate,
): Result<DetectionCandidate, CandidateError> => {
  const { start, end } = candidate.range;
  if (start < 0 || end > text.length || start >= end) return err('rangeOutOfText');
  if (text.slice(start, end).trim().length === 0) return err('blankCandidate');
  return ok(candidate);
};

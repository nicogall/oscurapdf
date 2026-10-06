import type { CharRange } from '@shared-kernel';
import { createDetectionCandidate, type ConfidenceLevel, type DetectionCandidate, type PiiCategory } from '@shared-kernel/published';
import type { DetectionInput } from '../detector';

/** A match in the normalized text: its range there and its matched (normalized) value. */
export interface NormalizedMatch {
  readonly range: CharRange;
  readonly value: string;
}

/** All matches of a global regex in the normalized text. */
export const matchesOf = (input: DetectionInput, pattern: RegExp): NormalizedMatch[] =>
  [...input.normalized.normalized.matchAll(pattern)].map((m) => ({
    range: { start: m.index, end: m.index + m[0].length },
    value: m[0],
  }));

/** Maps a normalized range back to the original text and builds a validated rule candidate. */
export const candidateAt = (
  input: DetectionInput,
  normalizedRange: CharRange,
  category: PiiCategory,
  confidence: ConfidenceLevel,
): DetectionCandidate[] => {
  const range = input.normalized.offsets.toOriginal(normalizedRange);
  const candidate = createDetectionCandidate(input.text, { category, range, confidence, method: 'rule' });
  return candidate.ok ? [candidate.value] : [];
};

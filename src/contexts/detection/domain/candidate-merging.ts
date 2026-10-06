import { rangesOverlap } from '@shared-kernel';
import { compareConfidence, type DetectionCandidate } from '@shared-kernel/published';

const length = (c: DetectionCandidate): number => c.range.end - c.range.start;

/** The generic identifier yields to a specific category covering the same text. */
const specificity = (c: DetectionCandidate): number => (c.category === 'CONTEXTUAL_ID' ? 0 : 1);

/**
 * An organization's name can run into the person next to it ("Comune di Bari Mario Rossi"): at equal
 * confidence the personal datum is kept whole, whatever its length.
 */
const personal = (c: DetectionCandidate): number => (c.category === 'ORGANIZATION' ? 0 : 1);

/** Priority: higher confidence; then personal data over organizations; then the longer span; then the specific category; then the earlier one. */
const byPriority = (a: DetectionCandidate, b: DetectionCandidate): number =>
  compareConfidence(b.confidence, a.confidence) ||
  personal(b) - personal(a) ||
  length(b) - length(a) ||
  specificity(b) - specificity(a) ||
  a.range.start - b.range.start;

/** Resolves overlaps: the higher confidence wins; if equal, the longer span wins. */
export const mergeCandidates = (candidates: readonly DetectionCandidate[]): DetectionCandidate[] => {
  const accepted: DetectionCandidate[] = [];
  for (const candidate of [...candidates].sort(byPriority)) {
    if (!accepted.some((kept) => rangesOverlap(kept.range, candidate.range))) accepted.push(candidate);
  }
  return accepted.sort((a, b) => a.range.start - b.range.start);
};

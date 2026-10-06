import type { DetectionCandidate } from '@shared-kernel/published';
import type { RedactionId } from './redaction';
import type { RedactionSet } from './redaction-set';

/**
 * Adds automatic detections to the set. Candidates with the same normalized text (whole-word,
 * case-insensitive) merge into one redaction covering all occurrences (FR-012a, constitution IV).
 */
export const intakeCandidates = (set: RedactionSet, candidates: readonly DetectionCandidate[]): RedactionId[] =>
  candidates.flatMap((candidate) => {
    const added = set.addAutomatic({ range: candidate.range, category: candidate.category, confidence: candidate.confidence });
    return added.ok ? [added.value] : [];
  });

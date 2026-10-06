import type { DetectionCandidate } from '@shared-kernel/published';

/**
 * FR-011 extension point: an optional on-device step (e.g. a small language model) that re-assesses
 * ambiguous candidates. Not provided in the MVP; plugging one in changes nothing downstream.
 */
export interface AmbiguityAssessor {
  assess(text: string, candidates: readonly DetectionCandidate[]): Promise<DetectionCandidate[]>;
}

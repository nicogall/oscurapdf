import { normalizeText, type NormalizedText } from '@shared-kernel';
import type { DetectionCandidate } from '@shared-kernel/published';

/** The document text plus its one shared normalization (computed once per detection run). */
export interface DetectionInput {
  readonly text: string;
  readonly normalized: NormalizedText;
}

export const createDetectionInput = (text: string): DetectionInput => ({ text, normalized: normalizeText(text) });

/** A deterministic rule detector (one per module). Ranges are in original-text offsets. */
export interface Detector {
  readonly name: string;
  detect(input: DetectionInput): DetectionCandidate[];
}

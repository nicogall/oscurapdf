import type { DetectionCandidate } from '@shared-kernel/published';
import type { DetectionOutcome } from './detection-pipeline';
import type { ProgressSink } from './ports/entity-recognizer';

/** Receives suggestions as soon as part of the document is done (before the final outcome). */
export type PartialSink = (candidates: readonly DetectionCandidate[]) => void;

/** Runs detection. Implemented by DetectPii (worker), the worker client, and segmented detection. */
export interface PiiDetector {
  execute(text: string, progress?: ProgressSink, partial?: PartialSink): Promise<DetectionOutcome>;
}

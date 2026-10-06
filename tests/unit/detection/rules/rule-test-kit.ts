import type { DetectionCandidate } from '@shared-kernel/published';
import { createDetectionInput, type Detector } from '../../../../src/contexts/detection/domain/detector';

/** Runs a detector and returns [matched original text, confidence] pairs. */
export const run = (detector: Detector, text: string): Array<[string, DetectionCandidate['confidence']]> =>
  detector.detect(createDetectionInput(text)).map((c) => [text.slice(c.range.start, c.range.end), c.confidence]);

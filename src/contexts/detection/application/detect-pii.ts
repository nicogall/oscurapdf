import type { Detector } from '../domain/detector';
import { runDetectionPipeline, type DetectionOutcome } from './detection-pipeline';
import type { AmbiguityAssessor } from './ports/ambiguity-assessor';
import type { EntityRecognizer, ProgressSink } from './ports/entity-recognizer';

export interface DetectPiiDeps {
  readonly rules: readonly Detector[];
  readonly recognizer?: EntityRecognizer;
  readonly assessor?: AmbiguityAssessor;
}

/** Detects PII candidates in the document text. Never removes anything (FR-010). */
export class DetectPii {
  constructor(private readonly deps: DetectPiiDeps) {}

  execute(text: string, progress: ProgressSink = () => undefined): Promise<DetectionOutcome> {
    return runDetectionPipeline(this.deps, text, progress);
  }
}

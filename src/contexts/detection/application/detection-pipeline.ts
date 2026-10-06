import type { DetectionCandidate } from '@shared-kernel/published';
import { finalizeCandidates } from '../domain/candidate-finalizing';
import { createDetectionInput, type Detector } from '../domain/detector';
import type { AmbiguityAssessor } from './ports/ambiguity-assessor';
import type { EntityRecognizer, ProgressSink } from './ports/entity-recognizer';

export interface DetectionOutcome {
  readonly candidates: readonly DetectionCandidate[];
  /** True when the NER stage failed: rule results are still returned (constitution III). */
  readonly degraded: boolean;
}

export interface PipelineStages {
  readonly rules: readonly Detector[];
  readonly recognizer?: EntityRecognizer;
  /** Reserved for FR-011; unused in the MVP. */
  readonly assessor?: AmbiguityAssessor;
}

const runRecognizer = async (stages: PipelineStages, text: string, progress: ProgressSink) => {
  if (stages.recognizer === undefined) return { candidates: [], degraded: false };
  try {
    return { candidates: await stages.recognizer.detect(text, progress), degraded: false };
  } catch {
    return { candidates: [], degraded: true };
  }
};

/** Ordered stages: rules → NER → (reserved) ambiguity assessment → drop Low → overlap merging → name-part propagation. */
export const runDetectionPipeline = async (stages: PipelineStages, text: string, progress: ProgressSink): Promise<DetectionOutcome> => {
  const rules = stages.rules.flatMap((detector) => detector.detect(createDetectionInput(text)));
  progress('rules', 1);
  const ner = await runRecognizer(stages, text, progress);
  const merged = finalizeCandidates(text, [...rules, ...ner.candidates]);
  const candidates = stages.assessor === undefined ? merged : await stages.assessor.assess(text, merged);
  return { candidates, degraded: ner.degraded };
};

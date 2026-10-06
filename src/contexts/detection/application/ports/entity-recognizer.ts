import type { DetectionCandidate } from '@shared-kernel/published';

export type ProgressSink = (stage: string, fraction: number) => void;

/** On-device named-entity recognition (PERSON / LOCATION / ORGANIZATION). May throw on failure. */
export interface EntityRecognizer {
  detect(text: string, progress?: ProgressSink): Promise<DetectionCandidate[]>;
}

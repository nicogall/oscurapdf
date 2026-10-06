// Public API of the Detection bounded context (constitution VI: import only via this barrel).
export { createDetectionInput, type Detector, type DetectionInput } from './domain/detector';
export { mergeCandidates } from './domain/candidate-merging';
export { RULE_DETECTORS } from './domain/rules';
export type { EntityRecognizer, ProgressSink } from './application/ports/entity-recognizer';
export type { AmbiguityAssessor } from './application/ports/ambiguity-assessor';
export { runDetectionPipeline, type DetectionOutcome, type PipelineStages } from './application/detection-pipeline';
export { DetectPii, type DetectPiiDeps } from './application/detect-pii';
export type { PartialSink, PiiDetector } from './application/pii-detector';
export { SegmentedDetection, SEGMENT_CHARS } from './application/segmented-detection';
/** WASM threads per detection worker when cross-origin isolated (several workers run in parallel). */
export const DETECTION_THREADS_PER_WORKER = 4;
export { DetectionWorkerClient } from './infrastructure/detection-worker-client';
export { loadOnnxRuntime, type RuntimeUrls } from './infrastructure/runtime-assets';

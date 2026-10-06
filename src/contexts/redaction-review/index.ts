// Public API of the Redaction Review bounded context (constitution VI: import only via this barrel).
export type { DocumentText } from './domain/document-text';
export { validateArea, type PageSize } from './domain/area-validation';
export type { Occurrence } from './domain/occurrence';
export type {
  Redaction,
  RedactionCategory,
  RedactionConfidence,
  RedactionId,
  RedactionKind,
  RedactionSource,
} from './domain/redaction';
export { RedactionSet, type AutomaticInput, type ReviewError, type ReviewMode } from './domain/redaction-set';
export { findRedaction, summarize, type ReviewSummary } from './domain/redaction-queries';
export { buildPlan } from './domain/plan-builder';
export { RedactionReview } from './application/redaction-review-service';
export { ReviewStore, type ReviewSnapshot } from './application/review-store';
export { ReviewHistory, type HistoryState } from './application/review-history';

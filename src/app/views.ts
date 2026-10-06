/**
 * Read-only types for the presentation layer. Presentation imports only from `src/app`
 * (constitution VI), so view types of the contexts are re-exported here.
 */
export type { DocumentView, FileHandle, Page, PageBitmap, TextModelView, TextSpan, IngestionError, UnreadableText } from '@ingestion';
export type { SessionState } from './session-state';
export type { AppServices } from './app-services';
export type { Language } from './ports/preference-store';
export { LANGUAGES } from './ports/preference-store';
export type { ExportState } from './export-flow';
export type { DocumentWorkspace } from './document-workspace';
export { confirmUnverifiedSave, type UnverifiedSaveAcknowledgement } from './save-decision';
export type { Redaction, RedactionId, ReviewSnapshot, ReviewSummary } from '@review';
export type { CheckKind, VerificationCheck, VerificationReport } from '@verification';
export type { DetectionStatus } from './detection-run';
export type { PiiCategory, ConfidenceLevel } from '@shared-kernel/published';

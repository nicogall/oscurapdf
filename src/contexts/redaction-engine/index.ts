// Public API of the Redaction Engine bounded context (constitution VI: import only via this barrel).
export type { ExportResult, SideChannel, SideChannelRemoval } from './domain/export-result';
export { lineArtModeFor, type LineArtMode } from './domain/line-art-policy';
export { attachmentDecision, containsRedactedText, scrubValue, type ScrubbedValue } from './domain/side-channel-policy';
export type { ExportError, ProgressSink, RedactionWriter } from './application/ports/redaction-writer';
export { ExportRedactedPdf } from './application/export-redacted-pdf';
export { EngineWorkerClient } from './infrastructure/engine-worker-client';

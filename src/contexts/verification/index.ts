// Public API of the Verification bounded context (constitution VI: import only via this barrel).
export type { FailureLocator } from './domain/failure-locator';
export { checkFrom, type CheckKind, type VerificationCheck } from './domain/verification-check';
export type { VerificationOutcome, VerificationReport } from './domain/verification-report';
export { buildReport, outcomeOf } from './domain/outcome-rule';
export { validPdfCheck, type PageCounts } from './domain/checks/valid-pdf-check';
export { textAbsentCheck } from './domain/checks/text-absent-check';
export { geometryCheck, type GlyphBox } from './domain/checks/geometry-check';
export { sideChannelCheck, type SideChannelValue } from './domain/checks/side-channel-check';
export { imagePixelCheck, type ImageSample } from './domain/checks/image-pixel-check';
export { singleRevisionCheck } from './domain/checks/single-revision-check';
export type { IndependentPdfParser, ParsedPdf } from './application/ports/independent-pdf-parser';
export type { Inspection, RedactionInspector } from './application/ports/redaction-inspector';
export { VerifyRedaction, type VerificationInput } from './application/verify-redaction';
export type { Verifier } from './application/verifier';
export { VerificationWorkerClient } from './infrastructure/verification-worker-client';

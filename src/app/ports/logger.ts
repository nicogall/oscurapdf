/**
 * Logger port. Events are typed codes with numeric fields only, so document text can never be
 * logged (constitution I, FR-030).
 */
export type LogCode =
  | 'documentLoaded'
  | 'documentRejected'
  | 'documentClosed'
  | 'detectionCompleted'
  | 'detectionDegraded'
  | 'exportCompleted'
  | 'verificationCompleted'
  | 'verificationFailed'
  | 'workerError';

export interface LogEvent {
  readonly code: LogCode;
  readonly durationMs?: number;
  readonly count?: number;
}

export interface Logger {
  log(event: LogEvent): void;
}

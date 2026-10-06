import type { VerificationCheck } from './verification-check';

export type VerificationOutcome = 'verified' | 'failed';

export interface VerificationReport {
  readonly itemsRemoved: number;
  readonly checks: readonly VerificationCheck[];
  readonly outcome: VerificationOutcome;
}

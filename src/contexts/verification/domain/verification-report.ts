import type { VerificationCheck } from './verification-check';

export type VerificationOutcome = 'verified' | 'failed';

/**
 * Why nothing could be checked, as opposed to a check that found a leak: the verification did not
 * run at all, or an engine could not open the new file. Never carries document data.
 */
export type VerificationFault = 'verifierUnavailable' | 'parserFailed' | 'inspectorFailed' | 'bothEnginesFailed';

export interface VerificationReport {
  readonly itemsRemoved: number;
  readonly checks: readonly VerificationCheck[];
  readonly outcome: VerificationOutcome;
  readonly fault?: VerificationFault;
}

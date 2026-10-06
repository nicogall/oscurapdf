import type { VerificationCheck } from './verification-check';
import type { VerificationOutcome, VerificationReport } from './verification-report';

/** `verified` if and only if there are checks and every one passed (FR-026). */
export const outcomeOf = (checks: readonly VerificationCheck[]): VerificationOutcome =>
  checks.length > 0 && checks.every((check) => check.passed) ? 'verified' : 'failed';

export const buildReport = (itemsRemoved: number, checks: readonly VerificationCheck[]): VerificationReport => ({
  itemsRemoved,
  checks,
  outcome: outcomeOf(checks),
});

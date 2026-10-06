import type { VerificationCheck } from './verification-check';
import type { VerificationFault, VerificationOutcome, VerificationReport } from './verification-report';

/** `verified` if and only if there are checks and every one passed (FR-026). */
export const outcomeOf = (checks: readonly VerificationCheck[]): VerificationOutcome =>
  checks.length > 0 && checks.every((check) => check.passed) ? 'verified' : 'failed';

export const buildReport = (itemsRemoved: number, checks: readonly VerificationCheck[], fault?: VerificationFault): VerificationReport => ({
  itemsRemoved,
  checks,
  outcome: outcomeOf(checks),
  ...(fault === undefined ? {} : { fault }),
});

/** Which engine could not open the output, if any. */
export const engineFault = (parsed: boolean, inspected: boolean): VerificationFault | undefined => {
  if (parsed && inspected) return undefined;
  if (!parsed && !inspected) return 'bothEnginesFailed';
  return parsed ? 'inspectorFailed' : 'parserFailed';
};

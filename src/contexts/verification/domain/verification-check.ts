import type { FailureLocator } from './failure-locator';

export type CheckKind = 'validPdf' | 'textAbsent' | 'geometry' | 'sideChannels' | 'imagePixels' | 'singleRevision';

export interface VerificationCheck {
  readonly kind: CheckKind;
  readonly passed: boolean;
  readonly failures: readonly FailureLocator[];
}

export const checkFrom = (kind: CheckKind, failures: readonly FailureLocator[]): VerificationCheck => ({
  kind,
  passed: failures.length === 0,
  failures,
});

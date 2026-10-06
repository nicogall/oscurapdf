import type { VerificationReport } from '../domain/verification-report';
import type { VerificationInput } from './verify-redaction';

/** Runs verification. Implemented in the worker (VerifyRedaction) and on the main thread (worker client). */
export interface Verifier {
  execute(input: VerificationInput): Promise<VerificationReport>;
}

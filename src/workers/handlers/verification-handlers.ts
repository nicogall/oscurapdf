import { fromWirePlan, type WirePlan } from '@shared-kernel/published';
import type { Verifier } from '@verification';
import type { Handler } from '../protocol';

export interface VerifyRequest {
  readonly output: ArrayBuffer;
  readonly plan: WirePlan;
  readonly inputPageCount: number;
  readonly itemsRemoved: number;
}

/** Plain, unit-testable handler for the verification worker. */
export const createVerificationHandlers = (verifier: Verifier): Record<string, Handler> => ({
  verify: (payload) => {
    const request = payload as VerifyRequest;
    return verifier.execute({
      output: new Uint8Array(request.output),
      plan: fromWirePlan(request.plan),
      inputPageCount: request.inputPageCount,
      itemsRemoved: request.itemsRemoved,
    });
  },
});

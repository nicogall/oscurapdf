import { toWirePlan } from '@shared-kernel/published';
import type { RequestChannel } from '@workers/protocol';
import type { Verifier } from '../application/verifier';
import type { VerificationInput } from '../application/verify-redaction';
import { buildReport } from '../domain/outcome-rule';
import { checkFrom, type CheckKind } from '../domain/verification-check';
import type { VerificationReport } from '../domain/verification-report';

const ALL_CHECKS: readonly CheckKind[] = ['validPdf', 'textAbsent', 'geometry', 'sideChannels', 'imagePixels', 'singleRevision'];

/** If the worker itself fails, nothing was verified: every check fails (never a false "verified"). */
const unverified = (itemsRemoved: number): VerificationReport =>
  buildReport(itemsRemoved, ALL_CHECKS.map((kind) => checkFrom(kind, [{}])), 'verifierUnavailable');

/** Main-thread Verifier: the verification worker has its own PDF.js and MuPDF instances. */
export class VerificationWorkerClient implements Verifier {
  constructor(private readonly client: RequestChannel) {}

  async execute(input: VerificationInput): Promise<VerificationReport> {
    const output = input.output.slice();
    const payload = { output: output.buffer, plan: toWirePlan(input.plan), inputPageCount: input.inputPageCount, itemsRemoved: input.itemsRemoved };
    const result = await this.client.request<VerificationReport>('verify', payload, { transfer: [output.buffer] });
    return result.ok ? result.value : unverified(input.itemsRemoved);
  }
}

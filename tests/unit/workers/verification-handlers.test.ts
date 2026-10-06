import { describe, expect, it } from 'vitest';
import type { PageIndex } from '@shared-kernel';
import { toWirePlan } from '@shared-kernel/published';
import type { VerificationInput, Verifier } from '@verification';
import { createVerificationHandlers } from '@workers/handlers/verification-handlers';
import type { HandlerContext } from '@workers/protocol';

const plan = {
  areasByPage: new Map([[0 as PageIndex, [{ box: { x: 1, y: 1, width: 2, height: 2 }, origin: 'text' as const }]]]),
  redactedTexts: ['rossi'],
};
const context: HandlerContext = { progress: () => undefined, checkpoint: () => undefined, transfer: () => undefined };

describe('verification handlers', () => {
  it('rebuilds the input from the wire format and runs the verifier', async () => {
    const seen: VerificationInput[] = [];
    const verifier: Verifier = {
      execute: (input) => {
        seen.push(input);
        return Promise.resolve({ itemsRemoved: input.itemsRemoved, checks: [], outcome: 'failed' });
      },
    };
    const output = new Uint8Array([1, 2, 3]);
    const request = { output: output.buffer, plan: toWirePlan(plan), inputPageCount: 2, itemsRemoved: 4 };
    const report = await createVerificationHandlers(verifier).verify?.(request, context);
    expect(report).toEqual({ itemsRemoved: 4, checks: [], outcome: 'failed' });
    expect(seen[0]?.plan).toEqual(plan);
    expect([...(seen[0]?.output ?? [])]).toEqual([1, 2, 3]);
    expect(seen[0]?.inputPageCount).toBe(2);
  });
});

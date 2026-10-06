import { describe, expect, it } from 'vitest';
import type { PageIndex } from '@shared-kernel';
import { fromWirePlan, toWirePlan } from '@shared-kernel/published';
import { createExportHandler } from '@workers/handlers/export-handler';
import { HandlerError, type HandlerContext } from '@workers/protocol';
import { RecordingWriter } from '../../support/fakes/recording-writer';

const plan = {
  areasByPage: new Map([[1 as PageIndex, [{ box: { x: 1, y: 2, width: 3, height: 4 }, origin: 'text' as const }]]]),
  redactedTexts: ['rossi'],
};

const context = (): HandlerContext & { transfers: unknown[]; stages: string[] } => {
  const transfers: unknown[] = [];
  const stages: string[] = [];
  return {
    transfers,
    stages,
    progress: (stage) => stages.push(stage),
    checkpoint: () => undefined,
    transfer: (...buffers) => transfers.push(...buffers),
  };
};

describe('export handler', () => {
  it('plans survive the structured-clone wire format', () => {
    expect(fromWirePlan(toWirePlan(plan))).toEqual(plan);
  });

  it('writes with the writer and transfers the output buffer', async () => {
    const writer = new RecordingWriter();
    const ctx = context();
    const result = (await createExportHandler(writer)(toWirePlan(plan), ctx)) as { areasApplied: number };
    expect(result.areasApplied).toBe(1);
    expect(writer.plans[0]).toEqual(plan);
    expect(ctx.transfers).toHaveLength(1);
  });

  it('reports writer failures by code', async () => {
    await expect(createExportHandler(new RecordingWriter('noDocument'))(toWirePlan(plan), context())).rejects.toEqual(
      new HandlerError('noDocument'),
    );
  });
});

describe('export handler progress', () => {
  it('forwards writer progress to the request', async () => {
    const ctx = context();
    const writer = {
      write: (p: typeof plan, progress?: (s: string, f: number) => void) => {
        progress?.('redact', 1);
        return new RecordingWriter().write(p);
      },
    };
    await createExportHandler(writer)(toWirePlan(plan), ctx);
    expect(ctx.stages).toEqual(['redact']);
  });
});

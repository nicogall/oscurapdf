import { describe, expect, it } from 'vitest';
import { DetectPii, RULE_DETECTORS } from '@detection';
import { createDetectionHandlers } from '@workers/handlers/detection-handlers';
import type { HandlerContext } from '@workers/protocol';
import { ScriptedRecognizer } from '../../support/fakes/scripted-recognizer';

const context = (): HandlerContext & { stages: string[] } => {
  const stages: string[] = [];
  return { stages, progress: (s) => stages.push(s), checkpoint: () => undefined, transfer: () => undefined };
};

describe('detection handlers', () => {
  it('runs detection on the text and forwards progress', async () => {
    const ctx = context();
    const detector = new DetectPii({ rules: RULE_DETECTORS, recognizer: new ScriptedRecognizer([]) });
    const outcome = await createDetectionHandlers(detector).detect?.({ text: 'mail a@example.com' }, ctx);
    expect(outcome).toEqual({ candidates: [expect.objectContaining({ category: 'EMAIL' })], degraded: false });
    expect(ctx.stages).toEqual(['rules', 'ner']);
  });
});

describe('model download progress', () => {
  it('routes download progress of the loader to the running request as stage "models"', async () => {
    let report: (fraction: number) => void = () => undefined;
    const detector = {
      execute: () => {
        report(0.3);
        return Promise.resolve({ candidates: [], degraded: false });
      },
    };
    const ctx = context();
    await createDetectionHandlers(detector, {
      bindDownloadProgress: (r) => {
        report = r;
      },
    }).detect?.({ text: '' }, ctx);
    expect(ctx.stages).toEqual(['models']);
  });

  it('takes the ONNX runtime handed over by the page', async () => {
    const used: unknown[] = [];
    const detector = { execute: () => Promise.resolve({ candidates: [], degraded: false }) };
    const handlers = createDetectionHandlers(detector, { useRuntime: (urls) => used.push(urls) });
    expect(await handlers.useRuntime?.({ mjs: 'blob:m', wasm: 'blob:w' }, context())).toBe(true);
    expect(used).toEqual([{ mjs: 'blob:m', wasm: 'blob:w' }]);
    expect(await createDetectionHandlers(detector).useRuntime?.({ mjs: 'a', wasm: 'b' }, context())).toBe(true);
  });
});

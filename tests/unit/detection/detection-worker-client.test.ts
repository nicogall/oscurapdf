import { afterEach, describe, expect, it } from 'vitest';
import { DetectPii, DetectionWorkerClient, RULE_DETECTORS } from '@detection';
import { createDetectionHandlers } from '@workers/handlers/detection-handlers';
import { WorkerClient, WorkerHost, type Handler } from '@workers/protocol';
import { ScriptedRecognizer } from '../../support/fakes/scripted-recognizer';

const channels: MessageChannel[] = [];

const clientFor = (handlers: Record<string, Handler>) => {
  const channel = new MessageChannel();
  channels.push(channel);
  new WorkerHost(channel.port2, handlers).start();
  channel.port1.start();
  return new DetectionWorkerClient(new WorkerClient(channel.port1));
};

afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

const TEXT = 'Ubaldo Zara, mario@example.com';

describe('DetectionWorkerClient', () => {
  it('returns the outcome computed in the worker, with progress', async () => {
    const stages: string[] = [];
    const detector = new DetectPii({ rules: RULE_DETECTORS, recognizer: new ScriptedRecognizer([]) });
    const outcome = await clientFor(createDetectionHandlers(detector)).execute(TEXT, (s) => stages.push(s));
    expect(outcome.candidates).toHaveLength(1);
    expect(stages).toEqual(['rules', 'ner']);
  });

  it('falls back to rules on the main thread when the worker fails (degraded)', async () => {
    const outcome = await clientFor({ detect: () => Promise.reject(new Error('worker crashed')) }).execute(TEXT);
    expect(outcome.degraded).toBe(true);
    expect(outcome.candidates.map((c) => c.category)).toEqual(['EMAIL']);
  });

  it('hands the shared ONNX runtime to the worker', async () => {
    const used: unknown[] = [];
    const detector = new DetectPii({ rules: RULE_DETECTORS });
    const client = clientFor(createDetectionHandlers(detector, { useRuntime: (urls) => used.push(urls) }));
    expect(await client.useRuntime({ mjs: 'blob:m', wasm: 'blob:w' })).toBe(true);
    expect(used).toEqual([{ mjs: 'blob:m', wasm: 'blob:w' }]);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import type { PageIndex } from '@shared-kernel';
import { EngineWorkerClient } from '@engine';
import { createExportHandler } from '@workers/handlers/export-handler';
import { HandlerError, WorkerClient, WorkerHost, type Handler } from '@workers/protocol';
import { RecordingWriter } from '../../support/fakes/recording-writer';

const channels: MessageChannel[] = [];

const clientFor = (handler: Handler) => {
  const channel = new MessageChannel();
  channels.push(channel);
  new WorkerHost(channel.port2, { export: handler }).start();
  channel.port1.start();
  return new EngineWorkerClient(new WorkerClient(channel.port1));
};

afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

const plan = {
  areasByPage: new Map([[0 as PageIndex, [{ box: { x: 1, y: 2, width: 3, height: 4 }, origin: 'area' as const }]]]),
  redactedTexts: [],
};

describe('EngineWorkerClient', () => {
  it('sends the plan to the worker and returns the export result', async () => {
    const writer = new RecordingWriter();
    const result = await clientFor(createExportHandler(writer)).write(plan);
    expect(result.ok && result.value.areasApplied).toBe(1);
    expect(writer.plans[0]).toEqual(plan);
  });

  it('forwards progress', async () => {
    const stages: string[] = [];
    const handler: Handler = (_payload, ctx) => {
      ctx.progress('redact', 1);
      return Promise.resolve({ output: new Uint8Array(1), areasApplied: 1, sideChannelRemovals: [] });
    };
    await clientFor(handler).write(plan, (stage) => stages.push(stage));
    expect(stages).toEqual(['redact']);
  });

  it.each(['noDocument', 'cancelled'] as const)('maps worker error %s', async (code) => {
    const result = await clientFor(() => Promise.reject(new HandlerError(code))).write(plan);
    expect(result).toEqual({ ok: false, error: code });
  });

  it('maps unknown worker failures to writeFailed', async () => {
    const result = await clientFor(() => Promise.reject(new Error('boom'))).write(plan);
    expect(result).toEqual({ ok: false, error: 'writeFailed' });
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import type { PageIndex } from '@shared-kernel';
import { VerificationWorkerClient, type Verifier } from '@verification';
import { createVerificationHandlers } from '@workers/handlers/verification-handlers';
import { WorkerClient, WorkerHost, type Handler } from '@workers/protocol';

const channels: MessageChannel[] = [];

const clientFor = (handlers: Record<string, Handler>) => {
  const channel = new MessageChannel();
  channels.push(channel);
  new WorkerHost(channel.port2, handlers).start();
  channel.port1.start();
  return new VerificationWorkerClient(new WorkerClient(channel.port1));
};

afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

const input = {
  output: new Uint8Array([1, 2]),
  plan: { areasByPage: new Map([[0 as PageIndex, [{ box: { x: 1, y: 1, width: 1, height: 1 }, origin: 'area' as const }]]]), redactedTexts: [] },
  inputPageCount: 1,
  itemsRemoved: 1,
};

describe('VerificationWorkerClient', () => {
  it('returns the report computed in the worker, keeping the caller output intact', async () => {
    const verifier: Verifier = {
      execute: () => Promise.resolve({ itemsRemoved: 1, checks: [{ kind: 'validPdf', passed: true, failures: [] }], outcome: 'verified' }),
    };
    const report = await clientFor(createVerificationHandlers(verifier)).execute(input);
    expect(report.outcome).toBe('verified');
    expect(input.output.byteLength).toBe(2);
  });

  it('reports every check failed when the worker fails (never a false "verified")', async () => {
    const report = await clientFor({ verify: () => Promise.reject(new Error('crash')) }).execute(input);
    expect(report.outcome).toBe('failed');
    expect(report.checks).toHaveLength(6);
    expect(report.checks.every((c) => !c.passed)).toBe(true);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { err, ok, type PageIndex } from '@shared-kernel';
import type { PdfContents } from '@ingestion';
import { DocumentWorkerClient } from '../../../src/contexts/document-ingestion/infrastructure/document-worker-client';
import { HandlerError, WorkerClient, WorkerHost, type Handler } from '@workers/protocol';

const channels: MessageChannel[] = [];

const clientFor = (handlers: Record<string, Handler>) => {
  const channel = new MessageChannel();
  channels.push(channel);
  new WorkerHost(channel.port2, handlers).start();
  channel.port1.start();
  return new DocumentWorkerClient(new WorkerClient(channel.port1));
};

afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

const contents: PdfContents = { pages: [], text: [{ page: 0, lines: [] }] };

describe('DocumentWorkerClient', () => {
  it('reads through the worker and transfers the bytes', async () => {
    const client = clientFor({ read: () => Promise.resolve(contents) });
    const bytes = new ArrayBuffer(4);
    expect(await client.read(bytes)).toEqual(ok(contents));
    expect(bytes.byteLength).toBe(0);
  });

  it.each(['invalid', 'passwordProtected'] as const)('maps worker error code %s', async (code) => {
    const client = clientFor({ read: () => Promise.reject(new HandlerError(code)) });
    expect(await client.read(new ArrayBuffer(4))).toEqual(err(code));
  });

  it('maps unexpected worker failures to invalid', async () => {
    const client = clientFor({ read: () => Promise.reject(new Error('boom')) });
    expect(await client.read(new ArrayBuffer(4))).toEqual(err('invalid'));
  });

  it('renders pages and reports renderFailed on any worker error', async () => {
    const bitmap = { width: 2, height: 3 };
    const good = clientFor({ render: () => Promise.resolve(bitmap) });
    expect(await good.render(0 as PageIndex, 1)).toEqual(ok(bitmap));
    const bad = clientFor({ render: () => Promise.reject(new Error('boom')) });
    expect(await bad.render(0 as PageIndex, 1)).toEqual(err('renderFailed'));
  });

  it('close asks the worker to release everything', async () => {
    let closed = false;
    const client = clientFor({
      close: () => {
        closed = true;
        return Promise.resolve(null);
      },
    });
    await client.close();
    expect(closed).toBe(true);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { HandlerError, WorkerClient, WorkerHost, type Handler, type MessagePortLike } from '@workers/protocol';

const channels: MessageChannel[] = [];

const connect = (handlers: Record<string, Handler>) => {
  const channel = new MessageChannel();
  channels.push(channel);
  new WorkerHost(channel.port2, handlers).start();
  channel.port1.start();
  return new WorkerClient(channel.port1);
};

afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

describe('worker protocol', () => {
  it('correlates responses to requests by id', async () => {
    const client = connect({ echo: (payload) => Promise.resolve(payload) });
    const [a, b] = await Promise.all([client.request('echo', 1), client.request('echo', 2)]);
    expect(a).toEqual({ ok: true, value: 1 });
    expect(b).toEqual({ ok: true, value: 2 });
  });

  it('forwards progress events', async () => {
    const client = connect({
      work: async (_payload, ctx) => {
        ctx.progress('parse', 0.5);
        await Promise.resolve();
        return 'done';
      },
    });
    const stages: Array<[string, number]> = [];
    const result = await client.request('work', null, { onProgress: (s, f) => stages.push([s, f]) });
    expect(result.ok).toBe(true);
    expect(stages).toEqual([['parse', 0.5]]);
  });

  it('returns code-only errors, never free text', async () => {
    const client = connect({
      known: () => Promise.reject(new HandlerError('invalid')),
      unknown: () => Promise.reject(new Error('secret document text')),
    });
    expect(await client.request('known', null)).toEqual({ ok: false, error: { code: 'invalid' } });
    const unknown = await client.request('unknown', null);
    expect(unknown).toEqual({ ok: false, error: { code: 'internal' } });
    expect(JSON.stringify(unknown)).not.toContain('secret');
    expect(await client.request('missing', null)).toEqual({ ok: false, error: { code: 'unknownKind' } });
  });

  it('cancels at the next checkpoint', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const client = connect({
      slow: async (_payload, ctx) => {
        await gate;
        ctx.checkpoint();
        return 'finished';
      },
    });
    const controller = new AbortController();
    const pending = client.request('slow', null, { signal: controller.signal });
    controller.abort();
    await new Promise((r) => setTimeout(r, 10));
    release();
    expect(await pending).toEqual({ ok: false, error: { code: 'cancelled' } });
  });

  it('lets uncancelled work pass its checkpoints', async () => {
    const client = connect({
      work: (_payload, ctx) => {
        ctx.checkpoint();
        return Promise.resolve('done');
      },
    });
    expect(await client.request('work', null)).toEqual({ ok: true, value: 'done' });
  });

  it('transfers buffers instead of copying them', async () => {
    const client = connect({
      size: (payload, ctx) => {
        const buffer = payload as ArrayBuffer;
        const out = new ArrayBuffer(buffer.byteLength);
        ctx.transfer(out);
        return Promise.resolve(out);
      },
    });
    const input = new ArrayBuffer(16);
    const result = await client.request<ArrayBuffer>('size', input, { transfer: [input] });
    expect(input.byteLength).toBe(0);
    expect(result.ok && result.value.byteLength).toBe(16);
  });
});

/** Port pair that behaves like a worker global scope: messages with no listener yet are dropped. */
const lossyPair = () => {
  type Listener = (event: MessageEvent) => void;
  const make = () => ({ listeners: new Set<Listener>(), peer: undefined as unknown as { listeners: Set<Listener> } });
  const a = make();
  const b = make();
  a.peer = b;
  b.peer = a;
  const port = (side: ReturnType<typeof make>) => ({
    postMessage: (data: unknown) => {
      queueMicrotask(() => {
        for (const l of side.peer.listeners) l({ data } as MessageEvent);
      });
    },
    addEventListener: (type: string, l: Listener) => {
      if (type === 'message') side.listeners.add(l);
    },
    removeEventListener: (_type: string, l: Listener) => side.listeners.delete(l),
  });
  return [port(a), port(b)] as const;
};

describe('ready handshake (module workers with top-level await)', () => {
  it('queues requests until the host announces it is ready, then delivers them', async () => {
    const [clientPort, hostPort] = lossyPair();
    const client = new WorkerClient(clientPort);
    const pending = client.request('echo', 7);
    await new Promise((r) => setTimeout(r, 20));
    // The host starts late, like a worker still instantiating WASM: nothing may be lost.
    new WorkerHost(hostPort, { echo: (payload) => Promise.resolve(payload) }).start();
    expect(await pending).toEqual({ ok: true, value: 7 });
  });

  it('sends directly once the host is ready', async () => {
    const [clientPort, hostPort] = lossyPair();
    const client = new WorkerClient(clientPort);
    new WorkerHost(hostPort, { echo: (payload) => Promise.resolve(payload) }).start();
    await new Promise((r) => setTimeout(r, 5));
    expect(await client.request('echo', 'x')).toEqual({ ok: true, value: 'x' });
  });
});

describe('PendingRequests', () => {
  it('tracks how many requests are outstanding', async () => {
    const { PendingRequests } = await import('@workers/protocol');
    const pending = new PendingRequests();
    pending.add('a', { settle: () => undefined, onProgress: undefined });
    expect(pending.size).toBe(1);
    pending.handle({ v: 1, id: 'a', kind: 'x', ok: true, result: 1 });
    pending.handle({ v: 1, id: 'unknown', kind: 'x', ok: true, result: 1 });
    expect(pending.size).toBe(0);
  });
});

describe('worker that fails to load', () => {
  it('fails pending and later requests with workerUnavailable instead of hanging', async () => {
    const listeners = new Map<string, Array<(event: Event) => void>>();
    const port = {
      postMessage: () => undefined,
      addEventListener: (type: string, l: (event: Event) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), l]);
      },
      removeEventListener: () => undefined,
    };
    const client = new WorkerClient(port as unknown as MessagePortLike);
    const pending = client.request('work', null);
    for (const l of listeners.get('error') ?? []) l(new Event('error'));
    expect(await pending).toEqual({ ok: false, error: { code: 'workerUnavailable' } });
    expect(await client.request('work', null)).toEqual({ ok: false, error: { code: 'workerUnavailable' } });
  });
});

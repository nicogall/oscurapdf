import { afterEach, describe, expect, it } from 'vitest';
import { LazyWorkerClient, WorkerHost } from '@workers/protocol';

const channels: MessageChannel[] = [];

afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

describe('LazyWorkerClient', () => {
  it('starts the worker on the first request only, once', async () => {
    let started = 0;
    const client = new LazyWorkerClient(() => {
      started += 1;
      const channel = new MessageChannel();
      channels.push(channel);
      new WorkerHost(channel.port2, { echo: (payload) => Promise.resolve(payload) }).start();
      channel.port1.start();
      return channel.port1;
    });
    expect(started).toBe(0);
    expect(await client.request('echo', 'a')).toEqual({ ok: true, value: 'a' });
    expect(await client.request('echo', 'b')).toEqual({ ok: true, value: 'b' });
    expect(started).toBe(1);
    client.warm();
    expect(started).toBe(1);
  });

  it('can be started ahead of its first request', () => {
    let started = 0;
    const client = new LazyWorkerClient(() => {
      started += 1;
      const channel = new MessageChannel();
      channels.push(channel);
      return channel.port1;
    });
    client.warm();
    expect(started).toBe(1);
  });
});

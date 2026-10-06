import { describe, expect, it } from 'vitest';
import { ServiceWorkerRegistrar } from '@app/infrastructure/service-worker-registration';

const container = () => {
  const calls: string[] = [];
  return {
    calls,
    register: (url: string) => {
      calls.push(url);
      return Promise.resolve({} as ServiceWorkerRegistration);
    },
  };
};

describe('ServiceWorkerRegistrar', () => {
  it('registers once in production', async () => {
    const sw = container();
    const registrar = new ServiceWorkerRegistrar('production', sw);
    await registrar.register();
    await registrar.register();
    expect(sw.calls).toEqual(['/sw.js']);
  });

  it('registers under the base path when the app is published in a sub-folder', async () => {
    const sw = container();
    await new ServiceWorkerRegistrar('production', sw, '/oscurapdf/').register();
    expect(sw.calls).toEqual(['/oscurapdf/sw.js']);
  });

  it.each(['development', 'test', 'e2e-fault'])('never registers in %s mode', async (mode) => {
    const sw = container();
    await new ServiceWorkerRegistrar(mode, sw).register();
    expect(sw.calls).toEqual([]);
  });

  it('does nothing when service workers are unsupported', async () => {
    await expect(new ServiceWorkerRegistrar('production', undefined).register()).resolves.toBe(false);
  });

  it('reports registration failures without throwing', async () => {
    const failing = { register: () => Promise.reject(new Error('blocked')) };
    await expect(new ServiceWorkerRegistrar('production', failing).register()).resolves.toBe(false);
  });
});

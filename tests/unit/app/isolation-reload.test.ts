import { describe, expect, it, vi } from 'vitest';
import { reloadOnceForIsolation } from '@app/infrastructure/isolation-reload';

const container = (controller: unknown) => {
  let listener: () => void = () => undefined;
  return {
    controller,
    addEventListener: (_type: 'controllerchange', l: () => void) => {
      listener = l;
    },
    fire: () => {
      listener();
    },
  };
};

describe('reloadOnceForIsolation', () => {
  it('first visit, not isolated: reloads when the service worker takes control', async () => {
    const sw = container(null);
    const reload = vi.fn();
    expect(reloadOnceForIsolation({ container: sw, isolated: false, canReload: () => true, serverSendsIsolation: () => Promise.resolve(false), reload })).toBe(true);
    sw.fire();
    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });

  it('does not reload when the server already sends the headers (isolated already, or unsupported like Safari)', async () => {
    const sw = container(null);
    const reload = vi.fn();
    reloadOnceForIsolation({ container: sw, isolated: false, canReload: () => true, serverSendsIsolation: () => Promise.resolve(true), reload });
    sw.fire();
    await Promise.resolve();
    await Promise.resolve();
    expect(reload).not.toHaveBeenCalled();
  });

  it('never reloads while a document is open', () => {
    const sw = container(null);
    const reload = vi.fn();
    reloadOnceForIsolation({ container: sw, isolated: false, canReload: () => false, serverSendsIsolation: () => Promise.resolve(false), reload });
    sw.fire();
    expect(reload).not.toHaveBeenCalled();
  });

  it('does nothing when already isolated, already controlled, or without service workers', () => {
    const reload = vi.fn();
    expect(reloadOnceForIsolation({ container: container(null), isolated: true, canReload: () => true, serverSendsIsolation: () => Promise.resolve(false), reload })).toBe(false);
    expect(reloadOnceForIsolation({ container: container({}), isolated: false, canReload: () => true, serverSendsIsolation: () => Promise.resolve(false), reload })).toBe(false);
    expect(reloadOnceForIsolation({ container: undefined, isolated: false, canReload: () => true, serverSendsIsolation: () => Promise.resolve(false), reload })).toBe(false);
  });
});

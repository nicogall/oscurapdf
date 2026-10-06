import { describe, expect, it, vi } from 'vitest';
import { DeferredDetector, waitForServiceWorkerControl, type WarmableDetector } from '@app/infrastructure/deferred-detector';

const outcome = { candidates: [], degraded: false };

describe('DeferredDetector', () => {
  it('creates the underlying detector once, on first use', async () => {
    const execute = vi.fn(() => Promise.resolve(outcome));
    const warmUp = vi.fn(() => Promise.resolve());
    const inner: WarmableDetector = { execute, warmUp };
    const create = vi.fn(() => Promise.resolve(inner));
    const detector = new DeferredDetector(create);
    expect(create).not.toHaveBeenCalled();
    await detector.warmUp();
    await detector.execute('a');
    await detector.execute('b');
    expect(create).toHaveBeenCalledTimes(1);
    expect(warmUp).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('reports the one-off preparation (runtime, then models) as the "models" stage of a detection', async () => {
    let finishModels: () => void = () => undefined;
    const inner: WarmableDetector = {
      execute: () => Promise.resolve(outcome),
      warmUp: (progress) => {
        progress?.(0.5);
        return new Promise<void>((resolve) => {
          finishModels = resolve;
        });
      },
    };
    const detector = new DeferredDetector((progress) => {
      progress(1);
      return Promise.resolve(inner);
    });
    void detector.warmUp();
    const stages: Array<[string, number]> = [];
    const running = detector.execute('text', (stage, fraction) => stages.push([stage, fraction]));
    await vi.waitFor(() => {
      expect(stages).toContainEqual(['models', 0.575]);
    });
    finishModels();
    await running;
    // Runtime ready (15%), then halfway through the model download.
    expect(stages).toEqual([['models', 0.15], ['models', 0.575]]);
  });
});

describe('waitForServiceWorkerControl', () => {
  it('resolves immediately without service workers or when already controlled', async () => {
    await expect(waitForServiceWorkerControl(undefined, 1000)).resolves.toBe(false);
    await expect(waitForServiceWorkerControl({ controller: {}, addEventListener: vi.fn(), removeEventListener: vi.fn() }, 1000)).resolves.toBe(true);
  });

  it('waits for controllerchange', async () => {
    let fire: () => void = () => undefined;
    const container = { controller: null, addEventListener: (_: string, l: () => void) => (fire = l), removeEventListener: vi.fn() };
    const waiting = waitForServiceWorkerControl(container, 5000);
    fire();
    await expect(waiting).resolves.toBe(true);
  });

  it('gives up after the timeout (the app still works, just without offline caching)', async () => {
    vi.useFakeTimers();
    const container = { controller: null, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const waiting = waitForServiceWorkerControl(container, 3000);
    vi.advanceTimersByTime(3000);
    await expect(waiting).resolves.toBe(false);
    expect(container.removeEventListener).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

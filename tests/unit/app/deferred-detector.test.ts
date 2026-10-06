import { describe, expect, it, vi } from 'vitest';
import { DeferredDetector, ReleasedAfterUse, waitForServiceWorkerControl, type WarmableDetector } from '@app/infrastructure/deferred-detector';

const outcome = { candidates: [], degraded: false };

describe('DeferredDetector', () => {
  it('release stops the detector, and the next use creates a new one', async () => {
    const dispose = vi.fn();
    const create = vi.fn(() => Promise.resolve<WarmableDetector>({ execute: () => Promise.resolve(outcome), warmUp: () => Promise.resolve(), dispose }));
    const detector = new DeferredDetector(create);
    await detector.execute('a');
    await detector.release();
    expect(dispose).toHaveBeenCalledTimes(1);
    await detector.execute('b');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('release does nothing before the first use, and forgets a preparation that failed', async () => {
    const create = vi.fn<() => Promise<WarmableDetector>>().mockRejectedValueOnce(new Error('no model')).mockResolvedValue({ execute: () => Promise.resolve(outcome), warmUp: () => Promise.resolve() });
    const detector = new DeferredDetector(create);
    await detector.release();
    expect(create).not.toHaveBeenCalled();
    await expect(detector.execute('a')).rejects.toThrow('no model');
    await detector.release();
    await expect(detector.execute('a')).resolves.toEqual(outcome);
  });

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

describe('ReleasedAfterUse (phones: the model leaves memory before the export)', () => {
  const tracked = () => {
    const dispose = vi.fn();
    const execute = vi.fn(() => Promise.resolve(outcome));
    const detector = new DeferredDetector(() => Promise.resolve<WarmableDetector>({ execute, warmUp: () => Promise.resolve(), dispose }));
    return { dispose, execute, detector };
  };

  it('releases the detector after a detection', async () => {
    const { dispose, detector } = tracked();
    await expect(new ReleasedAfterUse(detector).execute('a')).resolves.toEqual(outcome);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('releases it also when the detection fails', async () => {
    const { dispose, execute, detector } = tracked();
    execute.mockRejectedValueOnce(new Error('x'));
    await expect(new ReleasedAfterUse(detector).execute('a')).rejects.toThrow('x');
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

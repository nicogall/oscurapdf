import type { DetectionOutcome, PartialSink, PiiDetector, ProgressSink } from '@detection';
import { ProgressRelay } from './progress-relay';

export interface ServiceWorkerControlSource {
  readonly controller: unknown;
  addEventListener(type: 'controllerchange', listener: () => void): void;
  removeEventListener(type: 'controllerchange', listener: () => void): void;
}

/**
 * Resolves true once the page is controlled by the service worker (or false after `timeoutMs`).
 * A worker created before that point bypasses the service worker, so its model downloads would not
 * be cached for offline use (FR-029).
 */
export const waitForServiceWorkerControl = (container: ServiceWorkerControlSource | undefined, timeoutMs: number): Promise<boolean> => {
  if (container === undefined) return Promise.resolve(false);
  if (container.controller) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = (controlled: boolean) => {
      clearTimeout(timer);
      container.removeEventListener('controllerchange', onChange);
      resolve(controlled);
    };
    const onChange = () => {
      done(true);
    };
    const timer = setTimeout(() => {
      done(false);
    }, timeoutMs);
    container.addEventListener('controllerchange', onChange);
  });
};

/** A detector whose tools (runtime, models) can be prepared before its first detection. */
export interface WarmableDetector extends PiiDetector {
  /** `progress` (0–1) follows the one-off downloads, if any. */
  warmUp(progress?: (fraction: number) => void): Promise<void>;
}

/** Share of the preparation progress taken by creating the detector (the ONNX runtime, 27 MB). */
const CREATE_SHARE = 0.15;

/**
 * Creates and prepares the real detector (workers, runtime, models) on first need: when a document
 * is chosen, or at the first detection. While it prepares, detections report its progress as the
 * `models` stage, so the user sees the one-off download.
 */
export class DeferredDetector implements PiiDetector {
  private inner: Promise<WarmableDetector> | undefined;
  private prepared: Promise<void> | undefined;
  private readonly progress = new ProgressRelay();

  constructor(private readonly create: (progress: (fraction: number) => void) => Promise<WarmableDetector>) {}

  /** Starts the preparation (idempotent). */
  warmUp(): Promise<void> {
    this.prepared ??= (async () => {
      const detector = await this.detector();
      await detector.warmUp((fraction) => {
        this.progress.emit(CREATE_SHARE + (1 - CREATE_SHARE) * fraction);
      });
    })();
    return this.prepared;
  }

  async execute(text: string, progress?: ProgressSink, partial?: PartialSink): Promise<DetectionOutcome> {
    const stop = this.progress.subscribe((fraction) => {
      progress?.('models', fraction);
    });
    try {
      await this.warmUp();
    } finally {
      stop();
    }
    return (await this.detector()).execute(text, progress, partial);
  }

  private detector(): Promise<WarmableDetector> {
    this.inner ??= this.create((fraction) => {
      this.progress.emit(CREATE_SHARE * fraction);
    });
    return this.inner;
  }
}

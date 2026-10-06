import type { PiiDetector } from '@detection';
import type { RuntimeUrls } from '../../contexts/detection/infrastructure/runtime-assets';
import type { Handler } from '../protocol';

/** Lets the worker route model-download progress to the request that triggered the download. */
export type DownloadProgressBinder = (report: (fraction: number) => void) => void;

export interface DetectionHandlerHooks {
  readonly bindDownloadProgress?: DownloadProgressBinder;
  /** The page hands over the ONNX runtime it loaded once for all detection workers. */
  readonly useRuntime?: (urls: RuntimeUrls) => void;
}

/** Plain, unit-testable handlers for the detection worker. */
export const createDetectionHandlers = (detector: PiiDetector, { bindDownloadProgress, useRuntime }: DetectionHandlerHooks = {}): Record<string, Handler> => ({
  useRuntime: (payload) => {
    useRuntime?.(payload as RuntimeUrls);
    return Promise.resolve(true);
  },
  detect: (payload, context) => {
    bindDownloadProgress?.((fraction) => {
      context.progress('models', fraction);
    });
    return detector.execute((payload as { text: string }).text, (stage, fraction) => {
      context.progress(stage, fraction);
    });
  },
});

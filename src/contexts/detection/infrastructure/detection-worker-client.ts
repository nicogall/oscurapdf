import type { RequestChannel } from '@workers/protocol';
import { DetectPii } from '../application/detect-pii';
import type { DetectionOutcome } from '../application/detection-pipeline';
import type { PiiDetector } from '../application/pii-detector';
import type { ProgressSink } from '../application/ports/entity-recognizer';
import { RULE_DETECTORS } from '../domain/rules';
import type { RuntimeUrls } from './runtime-assets';

/**
 * Main-thread PiiDetector: detection runs in the detection worker. If the worker itself fails,
 * the (cheap) rules run here instead and the outcome is marked degraded (constitution III).
 */
export class DetectionWorkerClient implements PiiDetector {
  constructor(private readonly client: RequestChannel) {}

  /** Hands over the ONNX runtime loaded once by the page (instead of once per worker). */
  async useRuntime(urls: RuntimeUrls): Promise<boolean> {
    return (await this.client.request<boolean>('useRuntime', urls)).ok;
  }

  async execute(text: string, progress?: ProgressSink): Promise<DetectionOutcome> {
    const result = await this.client.request<DetectionOutcome>('detect', { text }, progress ? { onProgress: progress } : {});
    if (result.ok) return result.value;
    const rulesOnly = await new DetectPii({ rules: RULE_DETECTORS }).execute(text);
    return { candidates: rulesOnly.candidates, degraded: true };
  }
}

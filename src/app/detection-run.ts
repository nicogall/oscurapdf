import type { PiiDetector } from '@detection';
import type { RedactionReview } from '@review';
import { ObservableStore } from './observable-store';
import type { Logger } from './ports/logger';

export type DetectionStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'running'; readonly stage: string; readonly fraction: number }
  | { readonly kind: 'done'; readonly found: number }
  | { readonly kind: 'degraded'; readonly found: number };

/** Background detection for one document; results go into the review as suggestions (FR-010). */
export class DetectionRun {
  readonly status = new ObservableStore<DetectionStatus>({ kind: 'idle' });

  constructor(
    private readonly detector: PiiDetector,
    private readonly review: RedactionReview,
    private readonly logger: Logger,
  ) {}

  async start(text: string): Promise<void> {
    this.status.set({ kind: 'running', stage: 'rules', fraction: 0 });
    const outcome = await this.detector.execute(
      text,
      (stage, fraction) => {
        this.status.set({ kind: 'running', stage, fraction });
      },
      // Suggestions appear page by page; the final outcome then adds what needs the whole text.
      (partial) => {
        this.review.addCandidates(partial);
      },
    );
    this.review.addCandidates(outcome.candidates);
    const found = outcome.candidates.length;
    this.status.set(outcome.degraded ? { kind: 'degraded', found } : { kind: 'done', found });
    this.logger.log({ code: outcome.degraded ? 'detectionDegraded' : 'detectionCompleted', count: found });
  }
}

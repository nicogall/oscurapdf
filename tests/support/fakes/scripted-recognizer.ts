import type { DetectionCandidate } from '@shared-kernel/published';
import type { EntityRecognizer } from '@detection';

/** EntityRecognizer test double: returns scripted candidates, or fails. */
export class ScriptedRecognizer implements EntityRecognizer {
  calls = 0;

  constructor(private readonly outcome: readonly DetectionCandidate[] | 'fail') {}

  detect(_text: string, progress?: (stage: string, fraction: number) => void): Promise<DetectionCandidate[]> {
    this.calls += 1;
    progress?.('ner', 1);
    return this.outcome === 'fail' ? Promise.reject(new Error('model unavailable')) : Promise.resolve([...this.outcome]);
  }
}

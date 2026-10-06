import type { Redaction } from '../domain/redaction';
import type { ReviewSummary } from '../domain/redaction-queries';
import type { ReviewMode } from '../domain/redaction-set';
import type { HistoryState } from './review-history';

export interface ReviewSnapshot {
  readonly items: readonly Redaction[];
  readonly summary: ReviewSummary;
  readonly mode: ReviewMode;
  readonly history: HistoryState;
}

type Listener = () => void;

/** Observable read side of the review (for `useSyncExternalStore`). */
export class ReviewStore {
  private readonly listeners = new Set<Listener>();

  constructor(private current: ReviewSnapshot) {}

  snapshot(): ReviewSnapshot {
    return this.current;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(next: ReviewSnapshot): void {
    this.current = next;
    for (const listener of this.listeners) listener();
  }
}

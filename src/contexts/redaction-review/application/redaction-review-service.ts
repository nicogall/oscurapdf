import type { CharRange, PageArea, Result } from '@shared-kernel';
import type { DetectionCandidate, RedactionPlan } from '@shared-kernel/published';
import { intakeCandidates } from '../domain/candidate-intake';
import type { PageSize } from '../domain/area-validation';
import type { DocumentText } from '../domain/document-text';
import { buildPlan } from '../domain/plan-builder';
import type { RedactionId } from '../domain/redaction';
import { summarize } from '../domain/redaction-queries';
import { RedactionSet, type ReviewError, type ReviewMode } from '../domain/redaction-set';
import { ReviewHistory } from './review-history';
import { ReviewStore, type ReviewSnapshot } from './review-store';

/** Application service of the review: runs commands on the aggregate and publishes snapshots. */
export class RedactionReview {
  readonly store: ReviewStore;
  /** Undo / redo of the user's commands (Cmd/Ctrl+Z). */
  readonly history: ReviewHistory;
  protected readonly set: RedactionSet;

  constructor(doc: DocumentText) {
    this.set = new RedactionSet(doc);
    this.history = new ReviewHistory(this.set, () => {
      this.publish();
    });
    this.store = new ReviewStore(this.currentSnapshot('editing'));
  }

  /** Automatic detections (US2): one publication for the whole batch. */
  addCandidates(candidates: readonly DetectionCandidate[]): void {
    intakeCandidates(this.set, candidates);
    this.publish();
  }

  addManualText(range: CharRange): Result<RedactionId, ReviewError> {
    return this.publishing(this.history.track(() => this.set.addManualText(range)));
  }

  addManualArea(area: PageArea, page: PageSize): Result<RedactionId, ReviewError> {
    return this.publishing(this.history.track(() => this.set.addManualArea(area, page)));
  }

  select(id: RedactionId): void {
    this.history.track(() => {
      this.set.setSelected(id, true);
    });
    this.publish();
  }

  deselect(id: RedactionId): void {
    this.history.track(() => {
      this.set.setSelected(id, false);
    });
    this.publish();
  }

  selectAll(): void {
    this.history.track(() => {
      this.set.setAllSelected(true);
    });
    this.publish();
  }

  deselectAll(): void {
    this.history.track(() => {
      this.set.setAllSelected(false);
    });
    this.publish();
  }

  delete(id: RedactionId): Result<void, ReviewError> {
    return this.publishing(this.history.track(() => this.set.delete(id)));
  }

  toPlan(): Result<RedactionPlan, 'nothingSelected'> {
    return buildPlan(this.set.items());
  }

  setMode(mode: ReviewMode): void {
    this.set.setMode(mode);
    this.store.publish(this.currentSnapshot(mode));
  }

  protected publishing<T, E>(result: Result<T, E>): Result<T, E> {
    if (result.ok) this.publish();
    return result;
  }

  private publish(): void {
    this.store.publish(this.currentSnapshot(this.store.snapshot().mode));
  }

  private currentSnapshot(mode: ReviewMode): ReviewSnapshot {
    const items = this.set.items();
    return { items, summary: summarize(items), mode, history: this.history.state() };
  }
}

import { diffItems, type HistoryDirection } from '../domain/change-set';
import type { RedactionSet } from '../domain/redaction-set';
import { UndoHistory } from '../domain/undo-history';

export interface HistoryState {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/**
 * Undo / redo of the user's review commands (select, deselect, add, delete). Automatic detections
 * are not user commands: they are never recorded, and undo never removes them.
 */
export class ReviewHistory {
  private readonly log = new UndoHistory();

  constructor(
    private readonly set: RedactionSet,
    private readonly changed: () => void,
  ) {}

  /** Runs a user command on the set and records what it changed (nothing recorded if no change). */
  track<T>(command: () => T): T {
    const before = this.set.items();
    const result = command();
    this.log.record(diffItems(before, this.set.items()));
    return result;
  }

  undo(): boolean {
    return this.step('undo');
  }

  redo(): boolean {
    return this.step('redo');
  }

  state(): HistoryState {
    return { canUndo: this.log.can('undo'), canRedo: this.log.can('redo') };
  }

  private step(direction: HistoryDirection): boolean {
    const moved = this.log.step(direction, (changes) => this.set.revert(changes, direction).ok);
    if (moved) this.changed();
    return moved;
  }
}

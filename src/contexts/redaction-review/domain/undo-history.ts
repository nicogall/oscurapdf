import type { ChangeSet, HistoryDirection } from './change-set';

export const HISTORY_LIMIT = 200;

/** Undo and redo stacks of user commands. A new command clears the redo stack. */
export class UndoHistory {
  private readonly stacks: Record<HistoryDirection, ChangeSet[]> = { undo: [], redo: [] };

  constructor(private readonly limit = HISTORY_LIMIT) {}

  record(changes: ChangeSet): void {
    if (changes.length === 0) return;
    this.stacks.undo.push(changes);
    if (this.stacks.undo.length > this.limit) this.stacks.undo.shift();
    this.stacks.redo.length = 0;
  }

  can(direction: HistoryDirection): boolean {
    return this.stacks[direction].length > 0;
  }

  /** Moves the latest command to the opposite stack, but only if `apply` succeeds. */
  step(direction: HistoryDirection, apply: (changes: ChangeSet) => boolean): boolean {
    const changes = this.stacks[direction].at(-1);
    if (changes === undefined || !apply(changes)) return false;
    this.stacks[direction].pop();
    this.stacks[direction === 'undo' ? 'redo' : 'undo'].push(changes);
    return true;
  }
}

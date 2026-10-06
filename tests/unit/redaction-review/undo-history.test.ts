import { describe, expect, it } from 'vitest';
import type { ChangeSet } from '../../../src/contexts/redaction-review/domain/change-set';
import { UndoHistory } from '../../../src/contexts/redaction-review/domain/undo-history';

const change = (n: number): ChangeSet => [{ id: String(n) as never, before: undefined, after: undefined, position: n }];

describe('UndoHistory', () => {
  it('undoes newest first, redoes in order, and a new command clears redo', () => {
    const history = new UndoHistory();
    const seen: ChangeSet[] = [];
    const apply = (c: ChangeSet) => (seen.push(c), true);
    history.record(change(1));
    history.record(change(2));
    expect(history.step('undo', apply)).toBe(true);
    expect(history.step('redo', apply)).toBe(true);
    expect(seen).toEqual([change(2), change(2)]);
    history.step('undo', apply);
    history.record(change(3));
    expect(history.can('redo')).toBe(false);
  });

  it('ignores empty change sets and does nothing when there is nothing to undo', () => {
    const history = new UndoHistory();
    history.record([]);
    expect(history.can('undo')).toBe(false);
    expect(history.step('undo', () => true)).toBe(false);
  });

  it('keeps the command on its stack when it cannot be applied (e.g. while exporting)', () => {
    const history = new UndoHistory();
    history.record(change(1));
    expect(history.step('undo', () => false)).toBe(false);
    expect(history.can('undo')).toBe(true);
    expect(history.can('redo')).toBe(false);
  });

  it('forgets the oldest commands beyond its limit', () => {
    const history = new UndoHistory(2);
    [1, 2, 3].forEach((n) => { history.record(change(n)); });
    const undone: ChangeSet[] = [];
    while (history.step('undo', (c) => (undone.push(c), true))) { /* drain */ }
    expect(undone).toEqual([change(3), change(2)]);
  });
});

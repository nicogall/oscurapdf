import type { Redaction, RedactionId } from './redaction';

/** How one item changed in a user command: its value before and after (undefined = absent). */
export interface RedactionChange {
  readonly id: RedactionId;
  readonly before: Redaction | undefined;
  readonly after: Redaction | undefined;
  /** Position in the list, so an undone deletion goes back where it was. */
  readonly position: number;
}

export type ChangeSet = readonly RedactionChange[];
export type HistoryDirection = 'undo' | 'redo';

/** Item-by-item difference. Redactions are immutable values, so identity means "unchanged". */
export const diffItems = (before: readonly Redaction[], after: readonly Redaction[]): ChangeSet => {
  const old = new Map(before.map((r, i) => [r.id, { r, i }]));
  const now = new Map(after.map((r, i) => [r.id, { r, i }]));
  return [...new Set([...old.keys(), ...now.keys()])].flatMap((id) => {
    const b = old.get(id);
    const a = now.get(id);
    const at = b ?? a;
    if (b?.r === a?.r || at === undefined) return [];
    return [{ id, before: b?.r, after: a?.r, position: at.i }];
  });
};

const ends = (change: RedactionChange, direction: HistoryDirection) =>
  direction === 'undo' ? { expected: change.after, target: change.before } : { expected: change.before, target: change.after };

/**
 * Puts each changed item back to its other state. An item changed since by something else
 * (e.g. automatic detection finishing in the background) is left alone: undo never discards
 * work the user did not do.
 */
export const applyChanges = (items: readonly Redaction[], changes: ChangeSet, direction: HistoryDirection): Redaction[] => {
  const current = new Map(items.map((r) => [r.id, r]));
  const applicable = changes.filter((c) => current.get(c.id) === ends(c, direction).expected);
  const targets = new Map(applicable.map((c) => [c.id, ends(c, direction).target]));
  const next = items.flatMap((r) => {
    if (!targets.has(r.id)) return [r];
    const target = targets.get(r.id);
    return target === undefined ? [] : [target];
  });
  const inserts = applicable
    .flatMap((c) => {
      const target = ends(c, direction).target;
      return current.has(c.id) || target === undefined ? [] : [{ position: c.position, target }];
    })
    .sort((a, b) => a.position - b.position);
  for (const { position, target } of inserts) next.splice(Math.min(position, next.length), 0, target);
  return next;
};

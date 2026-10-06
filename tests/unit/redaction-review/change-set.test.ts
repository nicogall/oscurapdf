import { describe, expect, it } from 'vitest';
import { applyChanges, diffItems } from '../../../src/contexts/redaction-review/domain/change-set';
import type { Redaction, RedactionId } from '../../../src/contexts/redaction-review/domain/redaction';

const item = (id: string, selected = true): Redaction => ({
  id: id as RedactionId,
  kind: 'text',
  text: id,
  key: id,
  occurrences: [],
  category: 'MANUAL',
  source: 'manual',
  confidence: 'userConfirmed',
  selected,
});
const ids = (items: readonly Redaction[]) => items.map((r) => `${r.id}${r.selected ? '' : '-'}`);

describe('change sets (undo / redo domain)', () => {
  const a = item('a');
  const b = item('b');
  const c = item('c');

  it('records only the items that changed, with their position', () => {
    const bOff = { ...b, selected: false };
    expect(diffItems([a, b, c], [a, bOff, c])).toEqual([{ id: 'b', before: b, after: bOff, position: 1 }]);
    expect(diffItems([a, b], [a, b])).toEqual([]);
    expect(diffItems([a, b], [a])).toEqual([{ id: 'b', before: b, after: undefined, position: 1 }]);
  });

  it('undo and redo restore the exact lists, including the position of a deleted item', () => {
    const before = [a, b, c];
    const after = [a, c];
    const changes = diffItems(before, after);
    expect(applyChanges(after, changes, 'undo')).toEqual(before);
    expect(applyChanges(before, changes, 'redo')).toEqual(after);
  });

  it('undoing a deletion of several items puts each back in its own place', () => {
    const d = item('d');
    const before = [a, b, c, d];
    const after = [a, c];
    expect(applyChanges(after, diffItems(before, after), 'undo')).toEqual(before);
  });

  it('undo of an addition removes it; redo puts it back', () => {
    const changes = diffItems([a], [a, b]);
    expect(ids(applyChanges([a, b], changes, 'undo'))).toEqual(['a']);
    expect(ids(applyChanges([a], changes, 'redo'))).toEqual(['a', 'b']);
  });

  it('leaves alone an item that something else changed in the meantime', () => {
    const changes = diffItems([a], [{ ...a, selected: false }]);
    const changedByDetection = { ...a, selected: false, confidence: 'high' as const };
    expect(applyChanges([changedByDetection, c], changes, 'undo')).toEqual([changedByDetection, c]);
  });

  it('undoing a bulk change restores every item in place', () => {
    const before = [a, item('b', false), c];
    const after = [item('a', false), item('b', false), item('c', false)];
    expect(ids(applyChanges(after, diffItems(before, after), 'undo'))).toEqual(['a', 'b-', 'c']);
  });
});

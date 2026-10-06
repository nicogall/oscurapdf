import { describe, expect, it } from 'vitest';
import { RedactionSet, findRedaction, summarize, type RedactionId } from '@review';
import { rangeOf, reviewDocument } from '../../support/fakes/document-text';

const get = (set: RedactionSet, id: RedactionId) => findRedaction(set.items(), id);

const setup = () => {
  const doc = reviewDocument();
  return { doc, set: new RedactionSet(doc) };
};

const addText = (set: RedactionSet, doc: ReturnType<typeof reviewDocument>, text: string, nth = 0) => {
  const result = set.addManualText(rangeOf(doc, text, nth));
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

describe('RedactionSet manual text (FR-012, FR-012a)', () => {
  it('covers all whole-word, case-insensitive occurrences', () => {
    const { set, doc } = setup();
    // nth = 1: the first "Rossi" substring is inside "Rossini".
    const id = addText(set, doc, 'Rossi', 1);
    const redaction = get(set, id);
    expect(redaction?.occurrences).toHaveLength(2);
    expect(redaction?.occurrences.map((o) => o.range && doc.text.slice(o.range.start, o.range.end))).toEqual(['ROSSI', 'Rossi']);
  });

  it('matches across a line break and keeps one area per line fragment', () => {
    const { set, doc } = setup();
    const id = set.addManualText(rangeOf(doc, 'ACME\nHoldings Ltd.'));
    const redaction = id.ok ? get(set, id.value) : undefined;
    expect(redaction?.occurrences).toHaveLength(2);
    expect(redaction?.occurrences[0]?.areas).toHaveLength(2);
  });

  it("includes the user's own selection exactly as made, even a partial word", () => {
    const { set, doc } = setup();
    const partial = rangeOf(doc, 'Rossi');
    const id = set.addManualText({ start: partial.start, end: partial.start + 3 });
    const redaction = id.ok ? get(set, id.value) : undefined;
    expect(redaction?.occurrences).toHaveLength(1);
    expect(redaction?.text).toBe('Ros');
  });

  it('trims surrounding whitespace from a selection', () => {
    const { set, doc } = setup();
    const leading = rangeOf(doc, ' John Smith.');
    // Include the trailing page separator (whitespace) as well.
    const id = set.addManualText({ start: leading.start, end: leading.end + 1 });
    expect(id.ok && get(set, id.value)?.text).toBe('John Smith.');
  });

  it('rejects blank selections', () => {
    const { set, doc } = setup();
    const at = doc.text.indexOf(' ');
    expect(set.addManualText({ start: at, end: at + 1 })).toEqual({ ok: false, error: 'blankSelection' });
  });

  it('keeps one redaction per normalized text (invariant 1)', () => {
    const { set, doc } = setup();
    const first = addText(set, doc, 'ROSSI');
    const second = addText(set, doc, 'Rossi', 1);
    expect(second).toBe(first);
    expect(set.items()).toHaveLength(1);
  });

  it('manual additions are MANUAL, user-confirmed and selected', () => {
    const { set, doc } = setup();
    const redaction = get(set, addText(set, doc, 'John Smith'));
    expect(redaction).toMatchObject({ kind: 'text', category: 'MANUAL', source: 'manual', confidence: 'userConfirmed', selected: true });
  });
});

describe('RedactionSet automatic items and upgrades', () => {
  it('initial selection: only high is preselected (selection policy, 2026-10-01)', () => {
    const { set, doc } = setup();
    const high = set.addAutomatic({ range: rangeOf(doc, 'John Smith'), category: 'PERSON', confidence: 'high' });
    const medium = set.addAutomatic({ range: rangeOf(doc, 'ROSSI'), category: 'PERSON', confidence: 'medium' });
    const low = set.addAutomatic({ range: rangeOf(doc, 'agreement'), category: 'CONTEXTUAL_ID', confidence: 'low' });
    expect([high, medium, low].map((id) => (id.ok ? get(set, id.value)?.selected : undefined))).toEqual([true, false, false]);
  });

  it('a manual addition upgrades an automatic redaction to manual/userConfirmed', () => {
    const { set, doc } = setup();
    const auto = set.addAutomatic({ range: rangeOf(doc, 'John Smith'), category: 'PERSON', confidence: 'low' });
    const manual = addText(set, doc, 'John Smith');
    expect(auto.ok && auto.value).toBe(manual);
    expect(get(set, manual)).toMatchObject({ source: 'manual', confidence: 'userConfirmed', selected: true, category: 'PERSON' });
  });

  it('a later automatic candidate never downgrades a manual redaction', () => {
    const { set, doc } = setup();
    const manual = addText(set, doc, 'John Smith');
    set.addAutomatic({ range: rangeOf(doc, 'John Smith'), category: 'PERSON', confidence: 'low' });
    expect(get(set, manual)).toMatchObject({ source: 'manual', confidence: 'userConfirmed', selected: true });
  });

  it('merging automatic candidates keeps the highest confidence', () => {
    const { set, doc } = setup();
    set.addAutomatic({ range: rangeOf(doc, 'John Smith'), category: 'PERSON', confidence: 'low' });
    const again = set.addAutomatic({ range: rangeOf(doc, 'John Smith'), category: 'PERSON', confidence: 'high' });
    expect(again.ok && get(set, again.value)?.confidence).toBe('high');
    expect(set.items()).toHaveLength(1);
  });
});

describe('RedactionSet selection, deletion and summary', () => {
  it('select, deselect, selectAll and deselectAll', () => {
    const { set, doc } = setup();
    const a = addText(set, doc, 'John Smith');
    const b = addText(set, doc, 'Rossi');
    set.setSelected(a, false);
    expect(get(set, a)?.selected).toBe(false);
    set.setSelected(a, true);
    expect(get(set, a)?.selected).toBe(true);
    set.setAllSelected(false);
    expect(set.items().every((r) => !r.selected)).toBe(true);
    set.setAllSelected(true);
    expect([get(set, a)?.selected, get(set, b)?.selected]).toEqual([true, true]);
  });

  it('delete is allowed only for manual redactions (invariant 3)', () => {
    const { set, doc } = setup();
    const auto = set.addAutomatic({ range: rangeOf(doc, 'John Smith'), category: 'PERSON', confidence: 'high' });
    const manual = addText(set, doc, 'Rossi');
    expect(auto.ok && set.delete(auto.value)).toEqual({ ok: false, error: 'notManual' });
    expect(set.delete(manual)).toEqual({ ok: true, value: undefined });
    expect(get(set, manual)).toBeUndefined();
    expect(set.delete(manual)).toEqual({ ok: false, error: 'notFound' });
  });

  it('summarizes total, automatic, manual and selected', () => {
    const { set, doc } = setup();
    set.addAutomatic({ range: rangeOf(doc, 'John Smith'), category: 'PERSON', confidence: 'high' });
    set.addAutomatic({ range: rangeOf(doc, 'agreement'), category: 'CONTEXTUAL_ID', confidence: 'low' });
    addText(set, doc, 'Rossi');
    expect(summarize(set.items())).toEqual({ total: 3, automatic: 2, manual: 1, selected: 2 });
  });

  it('area redactions never merge (invariant 4)', () => {
    const { set } = setup();
    const area = { page: 0 as never, box: { x: 1, y: 1, width: 10, height: 10 } };
    const a = set.addManualArea(area, { width: 595, height: 842 });
    const b = set.addManualArea(area, { width: 595, height: 842 });
    expect(a.ok && b.ok && a.value !== b.value).toBe(true);
    expect(set.items().map((r) => r.kind)).toEqual(['area', 'area']);
  });
});

describe('RedactionSet lifecycle', () => {
  it('is read-only while exporting', () => {
    const { set, doc } = setup();
    const id = addText(set, doc, 'Rossi');
    set.setMode('exporting');
    expect(set.addManualText(rangeOf(doc, 'John Smith'))).toEqual({ ok: false, error: 'readOnly' });
    expect(set.delete(id)).toEqual({ ok: false, error: 'readOnly' });
    set.setSelected(id, false);
    expect(get(set, id)?.selected).toBe(true);
    set.setMode('editing');
    set.setSelected(id, false);
    expect(get(set, id)?.selected).toBe(false);
  });
});

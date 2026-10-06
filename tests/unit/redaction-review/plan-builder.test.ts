import { describe, expect, it } from 'vitest';
import { RedactionSet, buildPlan } from '@review';
import { rangeOf, reviewDocument } from '../../support/fakes/document-text';

describe('buildPlan', () => {
  it('fails with nothingSelected when no redaction is selected', () => {
    const doc = reviewDocument();
    const set = new RedactionSet(doc);
    expect(buildPlan(set.items())).toEqual({ ok: false, error: 'nothingSelected' });
    const id = set.addManualText(rangeOf(doc, 'Rossi', 1));
    if (id.ok) set.setSelected(id.value, false);
    expect(buildPlan(set.items())).toEqual({ ok: false, error: 'nothingSelected' });
  });

  it('groups the areas of every selected occurrence by page, with text origin', () => {
    const doc = reviewDocument();
    const set = new RedactionSet(doc);
    set.addManualText(rangeOf(doc, 'ACME\nHoldings Ltd.'));
    const plan = buildPlan(set.items());
    if (!plan.ok) throw new Error(plan.error);
    expect(plan.value.areasByPage.get(0 as never)).toHaveLength(2);
    expect(plan.value.areasByPage.get(1 as never)).toHaveLength(1);
    expect([...plan.value.areasByPage.values()].flat().every((a) => a.origin === 'text')).toBe(true);
  });

  it('lists redacted texts normalized and de-duplicated, only for selected items', () => {
    const doc = reviewDocument();
    const set = new RedactionSet(doc);
    set.addManualText(rangeOf(doc, 'Rossi', 1));
    set.addManualText(rangeOf(doc, 'ROSSI'));
    const smith = set.addManualText(rangeOf(doc, 'John Smith'));
    if (smith.ok) set.setSelected(smith.value, false);
    const plan = buildPlan(set.items());
    expect(plan.ok && plan.value.redactedTexts).toEqual(['rossi']);
  });

  it('includes area redactions with area origin and no text', () => {
    const doc = reviewDocument();
    const set = new RedactionSet(doc);
    set.addManualArea({ page: 1 as never, box: { x: 5, y: 5, width: 20, height: 20 } }, { width: 595, height: 842 });
    const plan = buildPlan(set.items());
    expect(plan.ok && plan.value.areasByPage.get(1 as never)).toEqual([{ box: { x: 5, y: 5, width: 20, height: 20 }, origin: 'area' }]);
    expect(plan.ok && plan.value.redactedTexts).toEqual([]);
  });

  it('a selection crossing a page break yields areas on both pages', () => {
    const doc = reviewDocument();
    const set = new RedactionSet(doc);
    set.addManualText({ start: doc.text.indexOf('Smith.'), end: doc.text.indexOf('holdings') - 1 });
    const plan = buildPlan(set.items());
    expect(plan.ok && [...plan.value.areasByPage.keys()].sort()).toEqual([0, 1]);
  });
});

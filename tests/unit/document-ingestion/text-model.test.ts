import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TextModel } from '@ingestion';
import { CHAR_WIDTH, LINE_HEIGHT, pageText } from '../../support/fakes/page-text-builder';

const contract = TextModel.build([
  pageText(0, ['The agreement is between ACME', 'Holdings Ltd. and John Smith.']),
  pageText(1, ['acme holdings ltd. pays ROSSI.', 'Rossini is not Rossi.']),
]);

const textOf = (model: TextModel, range: { start: number; end: number }) => model.text.slice(range.start, range.end);

describe('TextModel structure', () => {
  it('joins lines with \\n and pages with \\f', () => {
    expect(contract.text).toContain('ACME\nHoldings');
    expect(contract.text).toContain('Smith.\facme');
  });

  it('has ordered, non-overlapping spans, one per line, with one box per character', () => {
    const spans = contract.spans;
    expect(spans).toHaveLength(4);
    for (let i = 1; i < spans.length; i++) {
      const previous = spans[i - 1];
      const current = spans[i];
      expect(previous && current && previous.range.end <= current.range.start).toBe(true);
    }
    for (const span of spans) expect(span.charBoxes.length).toBe(span.range.end - span.range.start);
  });

  it('knows which page a range is on', () => {
    const at = contract.text.indexOf('John');
    expect(contract.pageOf({ start: at, end: at + 4 })).toBe(0);
    const late = contract.text.indexOf('Rossini');
    expect(contract.pageOf({ start: late, end: late + 7 })).toBe(1);
    expect(contract.pageOf({ start: 9_999, end: 10_000 })).toBeUndefined();
  });

  it('skips empty lines without breaking offsets', () => {
    const model = TextModel.build([pageText(0, ['A', '', 'B'])]);
    expect(model.spans).toHaveLength(2);
    expect(model.text).toBe('A\n\nB');
  });
});

describe('TextModel.occurrencesOf (FR-012a)', () => {
  it('matches case-insensitively, whole words only, across line breaks', () => {
    const found = contract.occurrencesOf('ACME Holdings Ltd.');
    expect(found.map((r) => textOf(contract, r))).toEqual(['ACME\nHoldings Ltd.', 'acme holdings ltd.']);
  });

  it('matches "Rossi" and "ROSSI" but not "Rossini"', () => {
    const found = contract.occurrencesOf('Rossi');
    expect(found.map((r) => textOf(contract, r))).toEqual(['ROSSI', 'Rossi']);
  });

  it('returns nothing for blank needles', () => {
    expect(contract.occurrencesOf('   ')).toEqual([]);
  });

  it('every returned range maps back to text equal to the needle after normalization', () => {
    const words = ['alpha', 'beta', 'gamma', 'delta'];
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...words), { minLength: 1, maxLength: 12 }), fc.constantFrom(...words), (line, needle) => {
        const model = TextModel.build([pageText(0, [line.join(' ')])]);
        const found = model.occurrencesOf(needle.toUpperCase());
        return found.length === line.filter((w) => w === needle).length && found.every((r) => textOf(model, r) === needle);
      }),
    );
  });
});

describe('TextModel.areasFor', () => {
  it('merges character boxes into one box per line and per page', () => {
    const [range] = contract.occurrencesOf('ACME Holdings Ltd.');
    expect(range).toBeDefined();
    const areas = range ? contract.areasFor(range) : [];
    expect(areas).toHaveLength(2);
    expect(areas.map((a) => a.page)).toEqual([0, 0]);
    const [first, second] = areas;
    expect(first?.box.width).toBe(4 * CHAR_WIDTH);
    expect(second?.box.y).toBe(10 + LINE_HEIGHT);
    expect(second?.box.width).toBe('Holdings Ltd.'.length * CHAR_WIDTH);
  });

  it('splits a range that crosses a page break into areas on both pages', () => {
    const start = contract.text.indexOf('Smith.');
    const end = contract.text.indexOf('holdings');
    const pages = contract.areasFor({ start, end }).map((a) => a.page);
    expect(new Set(pages)).toEqual(new Set([0, 1]));
  });
});

describe('buildAreas robustness', () => {
  it('skips spans whose character boxes do not cover the range', async () => {
    const { buildAreas } = await import('../../../src/contexts/document-ingestion/domain/area-builder');
    const broken = { page: 0 as never, range: { start: 0, end: 4 }, line: 0, charBoxes: [] };
    expect(buildAreas([broken], { start: 0, end: 4 })).toEqual([]);
  });
});

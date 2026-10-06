import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeText } from '@shared-kernel';

describe('OffsetMap', () => {
  it('maps a normalized range back to the exact original characters', () => {
    const original = 'Mr.  ROSSI​ and\nJosé';
    const { normalized, offsets } = normalizeText(original);
    const start = normalized.indexOf('rossi');
    const range = offsets.toOriginal({ start, end: start + 5 });
    expect(original.slice(range.start, range.end)).toBe('ROSSI');
    const jose = normalized.indexOf('josé');
    const joseRange = offsets.toOriginal({ start: jose, end: jose + 4 });
    expect(original.slice(joseRange.start, joseRange.end)).toBe('José');
  });

  it('is monotonic and in bounds for any text', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', minLength: 1, maxLength: 40 }), (text) => {
        const { normalized, offsets } = normalizeText(text);
        let previous = -1;
        for (let i = 0; i < normalized.length; i++) {
          const r = offsets.toOriginal({ start: i, end: i + 1 });
          if (r.start < previous || r.start >= r.end || r.end > text.length) return false;
          previous = r.start;
        }
        return true;
      }),
    );
  });

  it('round-trips any substring of plain lowercase words', () => {
    const word = fc.stringMatching(/^[a-z]{1,8}$/);
    fc.assert(
      fc.property(fc.array(word, { minLength: 1, maxLength: 6 }), fc.nat(), (words, pick) => {
        const text = words.join(' ');
        const target = words[pick % words.length] ?? '';
        const { normalized, offsets } = normalizeText(text);
        const at = normalized.indexOf(target);
        const r = offsets.toOriginal({ start: at, end: at + target.length });
        return text.slice(r.start, r.end) === target;
      }),
    );
  });
});

describe('OffsetMap bounds', () => {
  it('throws for ranges outside the normalized text', () => {
    const { offsets } = normalizeText('abc');
    expect(() => offsets.toOriginal({ start: 2, end: 9 })).toThrow(RangeError);
  });
});

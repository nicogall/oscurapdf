import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeText } from '@shared-kernel';

describe('TextNormalization', () => {
  it('applies NFKC (compatibility forms become plain characters)', () => {
    expect(normalizeText('ﬁle').normalized).toBe('file');
    expect(normalizeText('ＡＣＭＥ').normalized).toBe('acme');
  });

  it('composes combining marks with their base character', () => {
    expect(normalizeText('José').normalized).toBe('josé');
  });

  it('removes zero-width characters and soft hyphens', () => {
    expect(normalizeText('Ro​ss­i').normalized).toBe('rossi');
  });

  it('collapses whitespace and line breaks into one space', () => {
    expect(normalizeText('ACME\n  Holdings\t Ltd.').normalized).toBe('acme holdings ltd.');
  });

  it('case-folds', () => {
    expect(normalizeText('ROSSI').normalized).toBe(normalizeText('rossi').normalized);
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 40 }), (text) => {
        const once = normalizeText(text).normalized;
        return normalizeText(once).normalized === once;
      }),
    );
  });
});

describe('TextNormalization regressions', () => {
  it.each(['˘', '῭', '΄', 'a ˘ b'])('is idempotent for spacing accents: %s', (text) => {
    const once = normalizeText(text).normalized;
    expect(normalizeText(once).normalized).toBe(once);
  });
});

import { describe, expect, it } from 'vitest';
import { findWholeWordOccurrences, isWholeWord, normalizeText } from '@shared-kernel';

const find = (text: string, needle: string) =>
  findWholeWordOccurrences(normalizeText(text).normalized, normalizeText(needle).normalized);

describe('WordBoundary', () => {
  it('matches whole words only, ignoring case', () => {
    expect(find('Rossi, ROSSI and Rossini', 'rossi')).toHaveLength(2);
  });

  it('treats apostrophes and hyphens as boundaries (IT/EN)', () => {
    expect(find("dell'ACME e ACME-Group", 'acme')).toHaveLength(2);
    expect(find("O'Brien", 'brien')).toHaveLength(1);
  });

  it('allows punctuation inside the needle', () => {
    expect(find('ACME Holdings Ltd. signed', 'acme holdings ltd.')).toHaveLength(1);
  });

  it('matches across collapsed line breaks', () => {
    expect(find('ACME\nHoldings Ltd.', 'ACME Holdings Ltd.')).toHaveLength(1);
  });

  it('returns no matches for an empty needle', () => {
    expect(find('anything', '')).toEqual([]);
  });

  it('checks both edges of a range', () => {
    expect(isWholeWord('xrossi', { start: 1, end: 6 })).toBe(false);
    expect(isWholeWord('rossix', { start: 0, end: 5 })).toBe(false);
    expect(isWholeWord('rossi', { start: 0, end: 5 })).toBe(true);
  });

  it('finds overlapping-candidate positions without skipping', () => {
    expect(find('aa aa aa', 'aa aa')).toHaveLength(2);
  });
});

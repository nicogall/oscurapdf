import { describe, expect, it } from 'vitest';
import { aggregateEntities } from '../../../src/contexts/detection/infrastructure/bio-aggregation';
import { chunkText } from '../../../src/contexts/detection/domain/text-chunking';
import { alignTokens, wordStarts } from '../../../src/contexts/detection/infrastructure/token-alignment';

const TEXT = 'tra ACME Holdings e Mario Rossi.';

describe('token alignment', () => {
  it('aligns WordPiece tokens (## continuations)', () => {
    const tokens = ['tra', 'ACM', '##E', 'Holdings', 'e', 'Mario', 'Rossi', '.'];
    const ranges = alignTokens(TEXT, tokens);
    expect(ranges.map((r) => r && TEXT.slice(r.start, r.end))).toEqual(tokens.map((t) => t.replace('##', '')));
    expect(wordStarts(tokens)).toEqual([true, true, false, true, true, true, true, true]);
  });

  it('aligns SentencePiece tokens (▁ word starts)', () => {
    const tokens = ['▁tra', '▁AC', 'ME', '▁Holding', 's'];
    expect(alignTokens(TEXT, tokens).map((r) => r && TEXT.slice(r.start, r.end))).toEqual(['tra', 'AC', 'ME', 'Holding', 's']);
    expect(wordStarts(tokens)).toEqual([true, true, false, true, false]);
  });

  it('punctuation glued by SentencePiece is a word of its own ("Esposito," is not one word)', () => {
    expect(wordStarts(['▁Es', 'posito', ',', '▁Romano', '▁e', '▁Colo', 'mbo', '.'])).toEqual([true, false, true, true, true, true, false, true]);
    expect(wordStarts(['▁(', 'Mario', ')'])).toEqual([true, true, true]);
  });

  it('leaves unalignable tokens undefined without losing the position', () => {
    expect(alignTokens(TEXT, ['tra', '[UNK]', '▁', 'ACM'])).toEqual([{ start: 0, end: 3 }, undefined, undefined, { start: 4, end: 7 }]);
  });
});

describe('BIO aggregation', () => {
  const tokens = ['tra', 'ACM', '##E', 'Holdings', 'e', 'Mario', 'Rossi', '.'];
  const ranges = alignTokens(TEXT, tokens);
  const starts = wordStarts(tokens);

  it('merges B-/I- runs into whole-word entities, scored by each word\'s first piece', () => {
    const spans = aggregateEntities(
      [
        { index: 2, label: 'B-ORG', score: 1 },
        { index: 3, label: 'I-ORG', score: 0.8 },
        { index: 4, label: 'I-ORG', score: 0.9 },
        { index: 6, label: 'B-PER', score: 1 },
        { index: 7, label: 'I-PER', score: 1 },
      ],
      ranges,
      starts,
    );
    expect(spans.map((s) => [TEXT.slice(s.range.start, s.range.end), s.type])).toEqual([['ACME Holdings', 'ORG'], ['Mario Rossi', 'PER']]);
    // ACME (first piece 1.0) + Holdings (0.9): the ##E piece does not count.
    expect(spans[0]?.score).toBeCloseTo(0.95);
  });

  it('starts a new entity at B- of a new word or on a type change', () => {
    const spans = aggregateEntities(
      [
        { index: 6, label: 'B-GIVENNAME', score: 1 },
        { index: 7, label: 'B-SURNAME', score: 1 },
      ],
      ranges,
      starts,
    );
    expect(spans.map((s) => s.type)).toEqual(['GIVENNAME', 'SURNAME']);
  });

  it('continues a B- label on a sub-word piece', () => {
    const spans = aggregateEntities(
      [
        { index: 2, label: 'B-ORG', score: 1 },
        { index: 3, label: 'B-ORG', score: 1 },
      ],
      ranges,
      starts,
    );
    expect(spans.map((s) => TEXT.slice(s.range.start, s.range.end))).toEqual(['ACME']);
  });
});

describe('word-level aggregation (no entity may start or end inside a word)', () => {
  const FORM = 'Cognome Rossi Nome Mario Cittadinanza Italiana';
  const formTokens = ['Cognome', 'Rossi', 'Nome', 'Mario', 'Ci', '##tta', '##dina', '##nza', 'Italiana'];
  const formRanges = alignTokens(FORM, formTokens);
  const formStarts = wordStarts(formTokens);
  const textOf = (spans: ReturnType<typeof aggregateEntities>) => spans.map((s) => [FORM.slice(s.range.start, s.range.end), s.type]);

  it('a label on a sub-word piece alone never produces a fragment like "ttadinanza"', () => {
    const spans = aggregateEntities([{ index: 6, label: 'B-LOC', score: 0.9 }, { index: 7, label: 'I-LOC', score: 0.9 }], formRanges, formStarts);
    expect(textOf(spans)).toEqual([]);
  });

  it('a word takes the label of its first piece and is always kept whole', () => {
    const spans = aggregateEntities(
      [
        { index: 5, label: 'B-ORG', score: 1 },
        { index: 6, label: 'B-PER', score: 1 },
        { index: 7, label: 'B-LOC', score: 1 },
      ],
      formRanges,
      formStarts,
    );
    expect(textOf(spans)).toEqual([['Cittadinanza', 'ORG']]);
  });

  it('I- continues only on the adjacent word; after a gap it starts a new entity', () => {
    const spans = aggregateEntities(
      [
        { index: 2, label: 'B-PER', score: 1 },
        { index: 4, label: 'I-PER', score: 1 },
        { index: 5, label: 'I-PER', score: 1 },
        { index: 9, label: 'I-PER', score: 1 },
      ],
      formRanges,
      formStarts,
    );
    expect(textOf(spans)).toEqual([['Rossi', 'PER'], ['Mario Cittadinanza Italiana', 'PER']]);
  });

  it('B- on the next word starts a new entity even of the same type', () => {
    const spans = aggregateEntities([{ index: 4, label: 'B-PER', score: 1 }, { index: 5, label: 'B-PER', score: 1 }], formRanges, formStarts);
    expect(textOf(spans)).toEqual([['Mario', 'PER'], ['Cittadinanza', 'PER']]);
  });
});

describe('text chunking', () => {
  it('keeps short text in one chunk', () => {
    expect(chunkText('a\nb', 100)).toEqual([{ start: 0, text: 'a\nb' }]);
  });

  it('splits at line boundaries with a one-line overlap and exact offsets', () => {
    const text = ['line one', 'line two', 'line three', 'line four'].join('\n');
    const chunks = chunkText(text, 20);
    for (const chunk of chunks) expect(text.slice(chunk.start, chunk.start + chunk.text.length)).toBe(chunk.text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.text).join('')).toContain('line four');
    expect(chunks[1]?.text.startsWith('line two')).toBe(true);
  });

  it('splits an over-long line at a space', () => {
    const chunks = chunkText('word '.repeat(50), 30);
    expect(chunks.every((c) => c.text.length <= 30)).toBe(true);
    expect(chunks.map((c) => c.text).join('')).toBe('word '.repeat(50));
  });

  it('hard-splits a line without spaces', () => {
    expect(chunkText('x'.repeat(50), 20).map((c) => c.text.length)).toEqual([20, 20, 10]);
  });
});

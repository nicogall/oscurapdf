import { describe, expect, it } from 'vitest';
import { buildCorpus } from './corpus-builder';

describe('ner-eval corpus', () => {
  it('labels every slot with exact offsets', () => {
    for (const sentence of [...buildCorpus('it', 16, 1), ...buildCorpus('en', 16, 2)]) {
      expect(sentence.entities.length).toBeGreaterThan(0);
      for (const e of sentence.entities) expect(sentence.text.slice(e.start, e.end)).not.toMatch(/[{}]/);
    }
  });

  it('is deterministic for a seed and covers all three categories', () => {
    const corpus = buildCorpus('en', 16, 5);
    expect(buildCorpus('en', 16, 5)).toEqual(corpus);
    expect(new Set(corpus.flatMap((s) => s.entities.map((e) => e.category)))).toEqual(new Set(['PERSON', 'LOCATION', 'ORGANIZATION']));
  });
});

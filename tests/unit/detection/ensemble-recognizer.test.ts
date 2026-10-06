import { describe, expect, it } from 'vitest';
import { EnsembleRecognizer, type ModelRecognizer } from '../../../src/contexts/detection/infrastructure/ensemble-recognizer';
import { PII_LABELS, joinAdjacent, mapLabels, type ModelEntity } from '../../../src/contexts/detection/infrastructure/label-mapping';

const TEXT = 'Mario Rossi lives in Milano and works at ACME.';
const e = (start: number, end: number, category: ModelEntity['category'], score = 0.99): ModelEntity => ({ range: { start, end }, category, score });
const model = (id: string, entities: ModelEntity[] | 'fail'): ModelRecognizer => ({
  id,
  recognize: () => (entities === 'fail' ? Promise.reject(new Error('x')) : Promise.resolve(entities)),
});

describe('EnsembleRecognizer', () => {
  it('unions entities, grading people and organizations by their policies (places are not reported)', async () => {
    const candidates = await new EnsembleRecognizer([
      model('a', [e(0, 5, 'PERSON'), e(6, 11, 'PERSON'), e(21, 27, 'LOCATION', 0.6)]),
      model('b', [e(0, 11, 'PERSON'), e(41, 45, 'ORGANIZATION', 0.9)]),
    ]).detect(TEXT);
    expect(candidates.map((c) => [TEXT.slice(c.range.start, c.range.end), c.category, c.confidence])).toEqual([
      ['Mario Rossi', 'PERSON', 'high'],
      ['ACME', 'ORGANIZATION', 'medium'],
    ]);
    expect(candidates.every((c) => c.method === 'ner')).toBe(true);
  });

  it('reports other findings as Medium: a street with its number, an identifier; never a place or a number alone', async () => {
    const text = 'Abita in Via Roma 12, pratica 2024/17-B, a Milano.';
    const candidates = await new EnsembleRecognizer([
      model('a', [e(9, 20, 'LOCATION', 0.995), e(30, 39, 'CONTEXTUAL_ID', 0.995), e(43, 49, 'LOCATION', 0.995), e(51, 52, 'CONTEXTUAL_ID', 0.95)]),
    ]).detect(text);
    expect(candidates.map((c) => [text.slice(c.range.start, c.range.end), c.category, c.confidence])).toEqual([
      ['Via Roma 12', 'LOCATION', 'medium'],
      ['2024/17-B', 'CONTEXTUAL_ID', 'medium'],
    ]);
  });

  it('drops weak organizations', async () => {
    const candidates = await new EnsembleRecognizer([model('a', [e(41, 45, 'ORGANIZATION', 0.6)])]).detect(TEXT);
    expect(candidates).toEqual([]);
  });

  it('drops weak names', async () => {
    const candidates = await new EnsembleRecognizer([model('a', [e(0, 11, 'PERSON', 0.4)])]).detect(TEXT);
    expect(candidates).toEqual([]);
  });

  it('skips a failing model, and throws only when every model fails', async () => {
    const partial = await new EnsembleRecognizer([model('a', 'fail'), model('b', [e(0, 11, 'PERSON')])]).detect(TEXT);
    expect(partial).toHaveLength(1);
    await expect(new EnsembleRecognizer([model('a', 'fail'), model('b', 'fail')]).detect(TEXT)).rejects.toThrow();
  });
});

describe('label mapping', () => {
  it('maps the model labels to the app categories; drops places, dates and amounts, and what the rules check better', () => {
    const spans = ['FULLNAME', 'ORG', 'STREET', 'BUILDINGNUM', 'ID_DOC', 'DOCID', 'CATASTO', 'CF', 'IBAN', 'TARGA', 'CITY', 'DATE', 'AMOUNT'].map((type, i) => ({ range: { start: i, end: i + 1 }, type, score: 1 }));
    expect(mapLabels(spans, PII_LABELS).map((m) => m.category)).toEqual([
      'PERSON', 'ORGANIZATION', 'LOCATION', 'LOCATION', 'ID_DOCUMENT', 'CONTEXTUAL_ID', 'CONTEXTUAL_ID',
    ]);
  });

  it('joins same-category entities separated only by whitespace', () => {
    const joined = joinAdjacent([e(0, 5, 'PERSON', 0.9), e(6, 11, 'PERSON', 0.8), e(21, 27, 'LOCATION')], TEXT);
    expect(joined.map((j) => [TEXT.slice(j.range.start, j.range.end), j.score])).toEqual([['Mario Rossi', 0.8], ['Milano', 0.99]]);
  });

  it('never joins across a line break', () => {
    const text = 'Hannah Edwards\nHead of Operations';
    const joined = joinAdjacent([e(0, 14, 'PERSON'), e(15, 19, 'PERSON')], text);
    expect(joined.map((j) => text.slice(j.range.start, j.range.end))).toEqual(['Hannah Edwards', 'Head']);
  });
});

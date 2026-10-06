import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { DetectPii, RULE_DETECTORS } from '@detection';
import { TextModel } from '@ingestion';
import { createNerEnsemble } from '../../../src/contexts/detection/infrastructure/ner-models';
import { configureTransformers, createClassifierLoader } from '../../../src/contexts/detection/infrastructure/transformers-environment';
import { MuPdfReader } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-reader';
import { MuPdfSession } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-session';
import { PII_TRUTH } from '../../../tools/fixtures/generators/pii-sampler';
import { fixtureBytes } from '../../support/fixtures';

const RANK = { low: 0, medium: 1, high: 2 } as const;

beforeAll(() => {
  configureTransformers({ localModelPath: `${resolve('public/models')}/`, device: 'cpu' });
});

const detectSampler = async () => {
  const read = await new MuPdfReader(new MuPdfSession()).read(fixtureBytes('pii-sampler.pdf'));
  if (!read.ok) throw new Error(read.error);
  const text = TextModel.build(read.value.text).text;
  const outcome = await new DetectPii({ rules: RULE_DETECTORS, recognizer: createNerEnsemble(createClassifierLoader('cpu')) }).execute(text);
  return { text, outcome, found: outcome.candidates.map((c) => ({ text: text.slice(c.range.start, c.range.end), category: c.category, confidence: c.confidence })) };
};

describe('quickstart 2 at the pipeline level: pii-sampler.pdf', () => {
  it('finds every seeded item with the right category and at least the expected confidence', async () => {
    const { outcome, found } = await detectSampler();
    expect(outcome.degraded).toBe(false);
    for (const expected of PII_TRUTH.expected) {
      const match = found.find((f) => f.text === expected.text && f.category === expected.category);
      expect(match, `${expected.category} ${expected.text}`).toBeDefined();
      if ('confidence' in expected && match) expect(RANK[match.confidence]).toBeGreaterThanOrEqual(RANK[expected.confidence]);
    }
  });

  it('still covers identifiers with a wrong checksum when their shape or a keyword says what they are (2026-10-04)', async () => {
    const { found } = await detectSampler();
    for (const corrupted of PII_TRUTH.corrupted) {
      expect(found.some((f) => f.text === corrupted.text && f.category === corrupted.category), corrupted.text).toBe(corrupted.reported);
    }
  });

  it('suggests nothing it is not sure of (precision first)', async () => {
    const { found } = await detectSampler();
    for (const text of PII_TRUTH.notSuggested) expect(found.filter((f) => f.text.includes(text) || text.includes(f.text)), text).toEqual([]);
  });
});

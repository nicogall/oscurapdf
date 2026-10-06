/**
 * SC-006 / SC-006a / SC-006b evaluation with the real on-device model (Node).
 * Writes specs/001-oscurapdf/ner-eval-report.md and exits non-zero on the "fail" tier.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DetectionCandidate } from '../../src/shared-kernel/published';
import { DetectPii, RULE_DETECTORS } from '../../src/contexts/detection';
import { createNerEnsemble } from '../../src/contexts/detection/infrastructure/ner-models';
import { configureTransformers, createClassifierLoader } from '../../src/contexts/detection/infrastructure/transformers-environment';
import { TextModel } from '../../src/contexts/document-ingestion';
import { MuPdfReader } from '../../src/contexts/document-ingestion/infrastructure/mupdf-reader';
import { MuPdfSession } from '../../src/contexts/document-ingestion/infrastructure/mupdf-session';
import type { CorpusSentence } from './corpus-builder';
import { isFound, type EvalCategory, type Recall } from './metrics';
import { PRECISION_CORPUS } from './precision-corpus';
import { parseMarked, scorePrecision } from './precision';
import { renderReport, type EvalResults, type Language, type RecallTable } from './report';
import { syntheticIdentifiers } from './synthetic-identifiers';

const loadCorpus = (language: Language): CorpusSentence[] =>
  readFileSync(`tools/ner-eval/corpus/${language}.jsonl`, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as CorpusSentence);

/** Recall over the corpus run as one document (one sentence per line), like a real PDF. */
const recallFor = (sentences: readonly CorpusSentence[], candidates: readonly DetectionCandidate[]): Record<EvalCategory, Recall> => {
  const text = sentences.map((s) => s.text).join('\n');
  const proposed = candidates.map((c) => c.range);
  const table = { PERSON: { found: 0, total: 0 }, LOCATION: { found: 0, total: 0 }, ORGANIZATION: { found: 0, total: 0 } };
  let offset = 0;
  for (const sentence of sentences) {
    for (const e of sentence.entities) {
      const row = table[e.category];
      table[e.category] = { found: row.found + (isFound(text, { ...e, start: e.start + offset, end: e.end + offset }, proposed) ? 1 : 0), total: row.total + 1 };
    }
    offset += sentence.text.length + 1;
  }
  return table;
};

const recallTables = async (detector: DetectPii): Promise<Pick<EvalResults, 'shown' | 'preselected'>> => {
  const shown = {} as RecallTable;
  const preselected = {} as RecallTable;
  for (const language of ['it', 'en'] as const) {
    const sentences = loadCorpus(language);
    const { candidates } = await detector.execute(sentences.map((s) => s.text).join('\n'));
    shown[language] = recallFor(sentences, candidates);
    preselected[language] = recallFor(sentences, candidates.filter((c) => c.confidence === 'high'));
  }
  return { shown, preselected };
};

const precisionScores = async (detector: DetectPii): Promise<EvalResults['precision']> => {
  const scores: Array<EvalResults['precision'][number]> = [];
  for (const { name, marked } of PRECISION_CORPUS) {
    const doc = parseMarked(marked);
    const { candidates } = await detector.execute(doc.text);
    scores.push({ name, score: scorePrecision(doc, candidates.map((c) => ({ ...c.range, confidence: c.confidence }))) });
  }
  return scores;
};

/** SC-006: share of well-formed emails, IBANs and cards the rules report as High. */
const highRate = async (): Promise<EvalResults['rules']> => {
  const ids = syntheticIdentifiers(100);
  const rules = new DetectPii({ rules: RULE_DETECTORS });
  const rate = async (values: readonly string[], category: string, sentence: (v: string) => string) => {
    let high = 0;
    for (const value of values) {
      const outcome = await rules.execute(sentence(value));
      if (outcome.candidates.some((c) => c.category === category && c.confidence === 'high')) high += 1;
    }
    return high / values.length;
  };
  return {
    EMAIL: await rate(ids.emails, 'EMAIL', (v) => `Write to ${v} today.`),
    IBAN: await rate(ids.ibans, 'IBAN', (v) => `Pay to IBAN ${v}.`),
    PAYMENT_CARD: await rate(ids.cards, 'PAYMENT_CARD', (v) => `Card ${v.replace(/(\d{4})(?=\d)/g, '$1 ')} expires soon.`),
  };
};

/** SC-001 NER budget: warm detection time on the typical 10-page fixture. */
const tenPageMillis = async (detector: DetectPii): Promise<number> => {
  const read = await new MuPdfReader(new MuPdfSession()).read(new Uint8Array(readFileSync('tests/fixtures/pdf/ten-pages.pdf')).buffer);
  if (!read.ok) throw new Error(read.error);
  const text = TextModel.build(read.value.text).text;
  await detector.execute(text.slice(0, 2000));
  const start = performance.now();
  await detector.execute(text);
  return Math.round(performance.now() - start);
};

const main = async (): Promise<void> => {
  configureTransformers({ localModelPath: `${resolve('public/models')}/`, device: 'cpu' });
  const detector = new DetectPii({ rules: RULE_DETECTORS, recognizer: createNerEnsemble(createClassifierLoader('cpu')) });
  const results: EvalResults = { ...(await recallTables(detector)), precision: await precisionScores(detector), rules: await highRate(), millis: await tenPageMillis(detector) };
  const { text, tier } = renderReport(results);
  writeFileSync('specs/001-oscurapdf/ner-eval-report.md', text);
  console.log(text);
  if (tier === 'fail') process.exitCode = 1;
};

if (process.argv[1]?.endsWith('run.ts')) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

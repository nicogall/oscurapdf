import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { DetectPii, RULE_DETECTORS } from '@detection';
import { createNerEnsemble, NER_MODELS } from '../../../src/contexts/detection/infrastructure/ner-models';
import { configureTransformers, createClassifierLoader } from '../../../src/contexts/detection/infrastructure/transformers-environment';

const MODELS = resolve('public/models');

beforeAll(() => {
  for (const id of Object.values(NER_MODELS)) {
    if (!existsSync(resolve(MODELS, id, 'onnx/model_quantized.onnx'))) throw new Error(`Missing model ${id}: run \`npm run models:fetch\`.`);
  }
  configureTransformers({ localModelPath: `${MODELS}/`, device: 'cpu' });
});

const found = (text: string, candidates: ReadonlyArray<{ range: { start: number; end: number }; category: string }>) =>
  candidates.map((c) => [text.slice(c.range.start, c.range.end), c.category]);

describe('NER ensemble with the real on-device models', () => {
  it('reports people and organizations, with exact offsets (places are left to the rules)', async () => {
    const text = 'Il contratto tra ACME Holdings Ltd. e Mario Rossi, residente a Milano, è stato firmato.';
    const candidates = await createNerEnsemble(createClassifierLoader('cpu')).detect(text);
    expect(found(text, candidates)).toEqual([['ACME Holdings Ltd.', 'ORGANIZATION'], ['Mario Rossi', 'PERSON']]);
    // The model alone is never certain about an organization: Medium (shown, not preselected).
    expect(candidates[0]?.confidence).toBe('medium');
    // First + last name with a strong score: High (preselected).
    expect(candidates[1]?.confidence).toBe('high');
  });

  it('finds English names', async () => {
    const text = 'The agreement was signed by John Smith in London on behalf of Globex Corporation.';
    expect(found(text, await createNerEnsemble(createClassifierLoader('cpu')).detect(text))).toEqual([['John Smith', 'PERSON'], ['Globex Corporation', 'ORGANIZATION']]);
  });

  it('never proposes form labels or word fragments', async () => {
    const text = 'Cognome Rossi Nome Mario Cittadinanza Italiana Sesso M Stato civile Celibe';
    const pairs = found(text, await createNerEnsemble(createClassifierLoader('cpu')).detect(text));
    for (const [t] of pairs) expect(t, String(t)).toMatch(/^(Rossi|Mario|Mario Rossi|Rossi Mario)$/);
  });

  it('works across chunk boundaries of a long document', async () => {
    const filler = 'Clausola generica senza dati personali.\n'.repeat(60);
    const text = `${filler}Referente: Giulia Bianchi.\n${filler}`;
    const pairs = found(text, await createNerEnsemble(createClassifierLoader('cpu')).detect(text));
    expect(pairs).toContainEqual(['Giulia Bianchi', 'PERSON']);
  });

  it('runs inside the full pipeline together with the rules', async () => {
    const text = 'Mario Rossi, codice fiscale RSSMRA85T10A562S, email mario.rossi@example.com.';
    const outcome = await new DetectPii({ rules: RULE_DETECTORS, recognizer: createNerEnsemble(createClassifierLoader('cpu')) }).execute(text);
    expect(outcome.degraded).toBe(false);
    expect(found(text, outcome.candidates)).toEqual(
      expect.arrayContaining([['Mario Rossi', 'PERSON'], ['RSSMRA85T10A562S', 'IT_TAX_CODE'], ['mario.rossi@example.com', 'EMAIL']]),
    );
  });
  it('finds surnames alone, after titles and in capitals, and propagates confirmed ones (2026-10-01)', async () => {
    const text = [
      "Presiede l'avv. Ferrari; segretario il sig. Esposito.",
      'Presenti i condomini ROSSI MARIO e BIANCHI GIULIA.',
      'La dott.ssa Greco illustra il bilancio. Il condomino Rossi chiede chiarimenti.',
      'Gentile Rossi, la informiamo. Versamenti INPS e IBAN dagli USA.',
    ].join('\n');
    const outcome = await new DetectPii({ rules: RULE_DETECTORS, recognizer: createNerEnsemble(createClassifierLoader('cpu')) }).execute(text);
    const high = outcome.candidates.filter((c) => c.confidence === 'high').map((c) => text.slice(c.range.start, c.range.end));
    expect(high).toEqual(expect.arrayContaining(['Ferrari', 'Esposito', 'BIANCHI GIULIA', 'Greco', 'Rossi']));
    expect(high.join(' ')).not.toMatch(/Gentile|INPS|IBAN|USA/);
  });
  it('rare surnames written first: "Fittizio Marilena" (2026-10-01)', async () => {
    const text = ['Fittizio Marilena, nata a Bari', 'Il dipendente Fittizio Marilena è assegnato al reparto.', 'Docente: Ipotetico Ornella', 'Inventato Rosaria - assente'].join('\n');
    const outcome = await new DetectPii({ rules: RULE_DETECTORS, recognizer: createNerEnsemble(createClassifierLoader('cpu')) }).execute(text);
    const high = outcome.candidates.filter((c) => c.category === 'PERSON' && c.confidence === 'high').map((c) => text.slice(c.range.start, c.range.end));
    expect(high).toEqual(expect.arrayContaining(['Fittizio Marilena', 'Ipotetico Ornella', 'Inventato Rosaria']));
  });
});

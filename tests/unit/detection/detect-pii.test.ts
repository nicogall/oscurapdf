import { describe, expect, it, vi } from 'vitest';
import type { DetectionCandidate } from '@shared-kernel/published';
import { DetectPii, RULE_DETECTORS, type AmbiguityAssessor } from '@detection';
import { ScriptedRecognizer } from '../../support/fakes/scripted-recognizer';

// "Ubaldo" is not in the first-name list: only the (scripted) model can find this person.
const TEXT = 'Ubaldo Zara, mario.rossi@example.com, IBAN IT60X0542811101000000123456.';
const person = { category: 'PERSON' as const, range: { start: 0, end: 11 }, confidence: 'high' as const, method: 'ner' as const };

describe('DetectPii pipeline', () => {
  it('combines rule and NER candidates, in document order', async () => {
    const outcome = await new DetectPii({ rules: RULE_DETECTORS, recognizer: new ScriptedRecognizer([person]) }).execute(TEXT);
    expect(outcome.degraded).toBe(false);
    expect(outcome.candidates.map((c) => c.category)).toEqual(['PERSON', 'EMAIL', 'IBAN']);
  });

  it('never shows weak (Low) suggestions (precision first, 2026-10-01)', async () => {
    const weak = { ...person, confidence: 'low' as const };
    const outcome = await new DetectPii({ rules: RULE_DETECTORS, recognizer: new ScriptedRecognizer([weak]) }).execute(TEXT);
    expect(outcome.candidates.map((c) => c.category)).toEqual(['EMAIL', 'IBAN']);
  });

  it('never suggests one- or two-character texts (they would be blacked out everywhere)', async () => {
    const one = { category: 'PERSON' as const, range: { start: 0, end: 1 }, confidence: 'high' as const, method: 'ner' as const };
    const outcome = await new DetectPii({ rules: RULE_DETECTORS, recognizer: new ScriptedRecognizer([one]) }).execute(TEXT);
    expect(outcome.candidates.map((c) => c.category)).toEqual(['EMAIL', 'IBAN']);
  });

  it('NER failure → rule results are still returned, with degraded: true (constitution III)', async () => {
    const outcome = await new DetectPii({ rules: RULE_DETECTORS, recognizer: new ScriptedRecognizer('fail') }).execute(TEXT);
    expect(outcome.degraded).toBe(true);
    expect(outcome.candidates.map((c) => c.category)).toEqual(['EMAIL', 'IBAN']);
  });

  it('runs rules only when no recognizer is configured', async () => {
    const outcome = await new DetectPii({ rules: RULE_DETECTORS }).execute(TEXT);
    expect(outcome).toEqual(expect.objectContaining({ degraded: false }));
    expect(outcome.candidates).toHaveLength(2);
  });

  it('reports progress per stage', async () => {
    const progress = vi.fn();
    await new DetectPii({ rules: RULE_DETECTORS, recognizer: new ScriptedRecognizer([]) }).execute(TEXT, progress);
    expect(progress.mock.calls.map((c) => c[0] as string)).toEqual(['rules', 'ner']);
  });

  it('the reserved ambiguity-assessment stage (FR-011) is unused by default and pluggable', async () => {
    const assessor: AmbiguityAssessor = {
      assess: vi.fn((_t: string, c: readonly DetectionCandidate[]) => Promise.resolve(c.filter((x) => x.category !== 'EMAIL'))),
    };
    const plugged = await new DetectPii({ rules: RULE_DETECTORS, assessor }).execute(TEXT);
    expect(plugged.candidates.map((c) => c.category)).toEqual(['IBAN']);
  });
});

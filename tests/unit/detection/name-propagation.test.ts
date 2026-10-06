import { describe, expect, it } from 'vitest';
import type { DetectionCandidate } from '@shared-kernel/published';
import { propagateNameParts } from '../../../src/contexts/detection/domain/name-propagation';

const person = (text: string, name: string, confidence: DetectionCandidate['confidence'], nth = 0): DetectionCandidate => {
  let start = -1;
  for (let i = 0; i <= nth; i++) start = text.indexOf(name, start + 1);
  return { range: { start, end: start + name.length }, category: 'PERSON', confidence, method: 'ner' };
};
const shown = (text: string, candidates: readonly DetectionCandidate[]) => candidates.map((c) => [text.slice(c.range.start, c.range.end), c.confidence]);

describe('name propagation (surnames wherever they appear)', () => {
  it('a confirmed full name makes its surname and first name personal data elsewhere', () => {
    const text = 'Firmato da Mario Rossi. Il sig. ROSSI conferma; Mario approva.';
    expect(shown(text, propagateNameParts(text, [person(text, 'Mario Rossi', 'high')]))).toEqual([
      ['Mario Rossi', 'high'],
      ['ROSSI', 'high'],
      ['Mario', 'high'],
    ]);
  });

  it('raises Medium names that contain a confirmed part', () => {
    const text = 'Presente ROSSI MARIO. Il condomino Rossi chiede.';
    const result = propagateNameParts(text, [person(text, 'ROSSI MARIO', 'medium'), person(text, 'Rossi', 'medium')]);
    expect(shown(text, result)).toEqual([
      ['ROSSI MARIO', 'high'],
      ['Rossi', 'high'],
    ]);
  });

  it('a single Medium proposal is not enough evidence', () => {
    const text = 'Hanno partecipato Esposito e altri.';
    expect(shown(text, propagateNameParts(text, [person(text, 'Esposito', 'medium')]))).toEqual([['Esposito', 'medium']]);
  });

  it('never propagates a surname that is also a common word in the document, nor particles', () => {
    const text = 'Firmato: Laura Costa e Giovanni De Luca. Il servizio costa poco. De Marchi e Luca presenti.';
    const result = propagateNameParts(text, [person(text, 'Laura Costa', 'high'), person(text, 'Giovanni De Luca', 'high')]);
    expect(shown(text, result)).toEqual([
      ['Laura Costa', 'high'],
      ['Giovanni De Luca', 'high'],
      ['Luca', 'high'],
    ]);
  });

  it('leaves other categories alone', () => {
    const text = 'Email mario@example.com';
    const email: DetectionCandidate = { range: { start: 6, end: 23 }, category: 'EMAIL', confidence: 'high', method: 'rule' };
    expect(propagateNameParts(text, [email])).toEqual([email]);
  });
});

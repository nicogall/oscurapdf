import { describe, expect, it } from 'vitest';
import { gradeModelFinding } from '../../../src/contexts/detection/domain/model-finding-policy';

const grade = (text: string, span: string, score: number, category: Parameters<typeof gradeModelFinding>[3]) => {
  const start = text.indexOf(span);
  const graded = gradeModelFinding(text, { start, end: start + span.length }, score, category);
  return graded === undefined ? undefined : [text.slice(graded.range.start, graded.range.end), graded.confidence];
};

describe('model finding policy (addresses, identifiers, plates found by the model)', () => {
  it('shows a confident finding as Medium, never preselected', () => {
    expect(grade('istanza n. 8809/2021 presentata', '8809/2021', 0.99, 'CONTEXTUAL_ID')).toEqual(['8809/2021', 'medium']);
    expect(grade('residente in Via Roma 12 a Bari', 'Via Roma 12', 0.995, 'LOCATION')).toEqual(['Via Roma 12', 'medium']);
  });

  it('accepts phones, emails and cards from 0.90, everything else only from 0.99', () => {
    expect(grade('chiamare il 02 8765 4321 domani', '02 8765 4321', 0.92, 'PHONE')).toEqual(['02 8765 4321', 'medium']);
    expect(grade('chiamare il 02 8765 4321 domani', '02 8765 4321', 0.85, 'PHONE')).toBeUndefined();
    expect(grade('residente in Via Roma 12 a Bari', 'Via Roma 12', 0.92, 'LOCATION')).toBeUndefined();
  });

  it('drops a finding the model is not confident about', () => {
    expect(grade('istanza n. 8809/2021 presentata', '8809/2021', 0.98, 'CONTEXTUAL_ID')).toBeUndefined();
  });

  it('drops a place or a number on its own: only a street with something else is an address', () => {
    expect(grade('la sede di Milano', 'Milano', 0.99, 'LOCATION')).toBeUndefined();
    expect(grade('al numero 12 della via', '12', 0.99, 'LOCATION')).toBeUndefined();
  });

  it('never continues on the next line, and ignores an empty span', () => {
    expect(grade('Via Roma 12\nTorino', 'Via Roma 12\nTorino', 0.99, 'LOCATION')).toEqual(['Via Roma 12', 'medium']);
    expect(grade('a   b', '  ', 0.99, 'CONTEXTUAL_ID')).toBeUndefined();
  });
});

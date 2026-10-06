import { describe, expect, it } from 'vitest';
import { gradePerson } from '../../../src/contexts/detection/domain/person-policy';

const grade = (text: string, score: number, agreeing = 1) => {
  const result = gradePerson(text, { start: 0, end: text.length }, score, agreeing);
  return result === undefined ? undefined : [text.slice(result.range.start, result.range.end), result.confidence];
};

describe('person policy: only names we are sure of', () => {
  it('first + last name with a strong score is High', () => {
    expect(grade('Mario Rossi', 0.95)).toEqual(['Mario Rossi', 'high']);
  });

  it('a single capitalised word, or a weaker score, is Medium (shown, not preselected)', () => {
    expect(grade('Rossi', 0.95)).toEqual(['Rossi', 'medium']);
    expect(grade('Mario Rossi', 0.87)).toEqual(['Mario Rossi', 'medium']);
    expect(grade('Mario Rossi', 0.86, 2)).toEqual(['Mario Rossi', 'high']);
  });

  it('weak scores are dropped entirely', () => {
    expect(grade('Mario Rossi', 0.4)).toBeUndefined();
  });

  it('trims form labels at the edges and rejects spans that are only labels', () => {
    expect(grade('Nome Mario', 0.99)).toEqual(['Mario', 'medium']);
    expect(grade('Cittadinanza Italiana', 0.99)).toBeUndefined();
    expect(grade('Stato Civile', 0.99)).toBeUndefined();
  });

  it('rejects lowercase words and one-letter "names"', () => {
    expect(grade('il direttore', 0.99)).toBeUndefined();
    expect(grade('M', 0.99)).toBeUndefined();
  });
});

describe('person policy: surnames in context (2026-10-01)', () => {
  const at = (text: string, name: string, score: number) => {
    const start = text.indexOf(name);
    const result = gradePerson(text, { start, end: start + name.length }, score, 1);
    return result === undefined ? undefined : [text.slice(result.range.start, result.range.end), result.confidence];
  };

  it('a surname right after a title is High, even with a modest score', () => {
    expect(at('Il sig. Rossi ha firmato', 'Rossi', 0.99)).toEqual(['Rossi', 'high']);
    expect(at("L'avv. Ferrari rappresenta", 'Ferrari', 0.78)).toEqual(['Ferrari', 'high']);
    expect(at('La dott.ssa Greco visita', 'ssa Greco', 0.5)).toEqual(['Greco', 'high']);
    expect(at('Mr Thompson called', 'Thompson', 0.98)).toEqual(['Thompson', 'high']);
    expect(at('Il sig. Rossi ha firmato', 'Rossi', 0.3)).toBeUndefined();
  });

  it('greetings are never names', () => {
    expect(at('Gentile Bianchi, le scrivo', 'Gentile Bianchi', 0.99)).toEqual(['Bianchi', 'medium']);
    expect(at('Gentile cliente', 'Gentile', 0.99)).toBeUndefined();
  });

  it('a "name" with a company legal form is an organization', () => {
    expect(at('tra De Luca e ALFA SRL', 'ALFA SRL', 0.94)).toBeUndefined();
  });

  it('keeps the elided particle of the surname', () => {
    expect(at("Il sig. D'ANGELO PAOLO", "'ANGELO PAOLO", 0.9)).toEqual(["D'ANGELO PAOLO", 'high']);
    expect(at("Il sig. D'Angelo", 'Angelo', 0.9)).toEqual(["D'Angelo", 'high']);
  });

  it('a full name with a weaker score is still shown (Medium)', () => {
    expect(at('presenti ROSSI MARIO e altri', 'ROSSI MARIO', 0.78)).toEqual(['ROSSI MARIO', 'medium']);
  });
});

describe('person policy: names in capitals', () => {
  it('grows a capitalised name over its capitalised neighbours, never over labels', () => {
    const text = 'COGNOME ROSSI MARIO NATO A ROMA';
    const start = text.indexOf('MARIO');
    const graded = gradePerson(text, { start, end: start + 5 }, 0.95, 1);
    expect(graded && text.slice(graded.range.start, graded.range.end)).toBe('ROSSI MARIO');
  });

  it('leaves names in ordinary case alone (capitals rule; the surname rule needs a strong score)', () => {
    const text = 'Il cliente Mario Rossi';
    const start = text.indexOf('Rossi');
    const graded = gradePerson(text, { start, end: start + 5 }, 0.88, 1);
    expect(graded && text.slice(graded.range.start, graded.range.end)).toBe('Rossi');
  });
});

describe('person policy: line breaks', () => {
  it('a name never continues on the next line', () => {
    const text = 'Kind regards,\nHannah Edwards\nHead of Operations';
    const start = text.indexOf('Hannah');
    const graded = gradePerson(text, { start, end: text.indexOf('Head') + 4 }, 0.99, 1);
    expect(graded && text.slice(graded.range.start, graded.range.end)).toBe('Hannah Edwards');
  });
});

describe('person policy: capitals to the right', () => {
  const grow = (text: string, name: string) => {
    const start = text.indexOf(name);
    const graded = gradePerson(text, { start, end: start + name.length }, 0.95, 1);
    return graded && text.slice(graded.range.start, graded.range.end);
  };

  it('grows to the right, at most three words, and stops at labels and company forms', () => {
    expect(grow('presenti MARIO ROSSI, e altri', 'MARIO')).toBe('MARIO ROSSI');
    expect(grow('ANNA MARIA DE LUCA presente', 'ANNA')).toBe('ANNA MARIA DE');
    expect(grow('MARIO SESSO M', 'MARIO')).toBe('MARIO');
    expect(grow('MARIO SRL', 'MARIO')).toBe('MARIO');
  });
});

describe('person policy: a confident first name takes its surname along', () => {
  const grade = (text: string, name: string, score = 0.99) => {
    const start = text.indexOf(name);
    const graded = gradePerson(text, { start, end: start + name.length }, score, 1);
    return graded && [text.slice(graded.range.start, graded.range.end), graded.confidence];
  };

  it('surname before or after the first name', () => {
    expect(grade('Fittizio Marilena, nata a Bari', 'Marilena')).toEqual(['Fittizio Marilena', 'high']);
    expect(grade('Il dipendente Fittizio Marilena è assegnato', 'Marilena')).toEqual(['Fittizio Marilena', 'high']);
    expect(grade('Firmato da Marilena Fittizio oggi', 'Marilena')).toEqual(['Marilena Fittizio', 'high']);
  });

  it('not over a word that only starts a sentence, nor with a weak score', () => {
    expect(grade('Oggi Marilena è venuta.', 'Marilena')).toEqual(['Marilena', 'medium']);
    expect(grade('Fittizio Marilena', 'Marilena', 0.86)).toEqual(['Marilena', 'medium']);
  });

  it('a name containing an office or a company is not a person', () => {
    expect(grade('il cliente Ufficio Tecnico', 'Ufficio Tecnico')).toBeUndefined();
  });
});

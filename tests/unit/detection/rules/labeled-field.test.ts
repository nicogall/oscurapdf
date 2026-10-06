import { describe, expect, it } from 'vitest';
import { labeledFieldDetector } from '../../../../src/contexts/detection/domain/rules/labeled-field';
import { createDetectionInput } from '../../../../src/contexts/detection/domain/detector';

const found = (text: string) =>
  labeledFieldDetector.detect(createDetectionInput(text)).map((c) => [text.slice(c.range.start, c.range.end), c.category, c.confidence]);

describe('labelled field detector (form values, High)', () => {
  it('takes the value after name labels, stopping at the next label', () => {
    expect(found('Cognome ROSSI Nome MARIO Cittadinanza ITALIANA Sesso M')).toEqual([
      ['ROSSI', 'PERSON', 'high'],
      ['MARIO', 'PERSON', 'high'],
    ]);
  });

  it('understands punctuation, multi-word values and declarations', () => {
    expect(found('Nome e cognome: Maria Grazia Bianchi. Il sottoscritto Giuseppe Verdi dichiara')).toEqual([
      ['Maria Grazia Bianchi', 'PERSON', 'high'],
      ['Giuseppe Verdi', 'PERSON', 'high'],
    ]);
  });

  it('keeps exact offsets with a double space, and stops at the wide gap before the next column', () => {
    expect(found('Paziente: Inventato  Rosaria    Tessera sanitaria n. 1')).toEqual([['Inventato  Rosaria', 'PERSON', 'high']]);
  });

  it('takes birthplace and residence as places', () => {
    expect(found('nato a Palermo il 10/12/1985, residente in Torino')).toEqual([
      ['Palermo', 'LOCATION', 'high'],
      ['Torino', 'LOCATION', 'high'],
    ]);
  });

  it('works in English', () => {
    expect(found('Name: John Smith, Place of birth: Leeds')).toEqual([
      ['John Smith', 'PERSON', 'high'],
      ['Leeds', 'LOCATION', 'high'],
    ]);
  });

  it('ignores labels without a capitalised value', () => {
    expect(found('Il nome del file e il cognome sono richiesti.')).toEqual([]);
  });
  it('a label at the end of a line has no value: the next line is never taken', () => {
    expect(found('Data di nascita Luogo di nascita\nTabella 3 - Pagina 7')).toEqual([]);
    expect(found('Cognome:\nIndirizzo Via Roma')).toEqual([]);
  });
  it('a one-letter value or a value that is itself a label is no value', () => {
    expect(found('Nome: A, Cognome: Sesso')).toEqual([]);
  });
  it('role labels introduce a person, but never an office or a company (2026-10-01)', () => {
    expect(found('Docente: Ipotetico Ornella. Il dipendente Immaginario Agata.')).toEqual([
      ['Ipotetico Ornella', 'PERSON', 'high'],
      ['Immaginario Agata', 'PERSON', 'high'],
    ]);
    expect(found('Il cliente Ufficio Tecnico. Contraente: ALFA SRL. Cliente: Banca Alpina.')).toEqual([]);
  });

  it('never takes a title as the value: the titled-name rule finds the name after it', () => {
    expect(found('Il richiedente Avv. Chiara Esempio, il dipendente Dott.ssa Paola Fittizio, il cliente Ing. Luca Inventato')).toEqual([]);
  });

  it('takes a birthplace of several words, with its links', () => {
    expect(found('nato a Barcellona Pozzo di Gotto il 20.09.1981, residente in Busto Arsizio')).toEqual([
      ['Barcellona Pozzo di Gotto', 'LOCATION', 'high'],
      ['Busto Arsizio', 'LOCATION', 'high'],
    ]);
  });
});

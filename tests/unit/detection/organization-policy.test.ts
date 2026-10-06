import { describe, expect, it } from 'vitest';
import { gradeOrganization } from '../../../src/contexts/detection/domain/organization-policy';

const grade = (text: string, span: string, score: number) => {
  const start = text.indexOf(span);
  const graded = gradeOrganization(text, { start, end: start + span.length }, score);
  return graded === undefined ? undefined : [text.slice(graded.range.start, graded.range.end), graded.confidence];
};

describe('organization policy (model spans)', () => {
  it('shows a model organization as Medium, never preselected', () => {
    expect(grade('Lavora per Globex Corporation.', 'Globex Corporation', 0.99)).toEqual(['Globex Corporation', 'medium']);
    expect(grade('Cliente: Microsoft', 'Microsoft', 0.9)).toEqual(['Microsoft', 'medium']);
  });

  it('needs a confident model for a single word, less for several words', () => {
    expect(grade('Cliente: Microsoft', 'Microsoft', 0.8)).toBeUndefined();
    expect(grade('Lavora per Globex Corporation.', 'Globex Corporation', 0.6)).toEqual(['Globex Corporation', 'medium']);
    expect(grade('Lavora per Globex Corporation.', 'Globex Corporation', 0.4)).toBeUndefined();
  });

  it('trims greetings, form labels and lower-case words at the edges', () => {
    expect(grade('Spettabile Acme Logistica della', 'Spettabile Acme Logistica della', 0.95)).toEqual(['Acme Logistica', 'medium']);
    expect(grade('Nome Initech', 'Nome Initech', 0.95)).toEqual(['Initech', 'medium']);
  });

  it('never continues on the next line', () => {
    expect(grade('Northwind Traders\nHead Office', 'Northwind Traders\nHead Office', 0.95)).toEqual(['Northwind Traders', 'medium']);
  });

  it('drops acronyms, form values and bodies every organization has', () => {
    expect(grade('sul conto IBAN indicato', 'IBAN', 0.99)).toBeUndefined();
    expect(grade('Alfa S.r.l. (P.IVA 01234567897)', 'P.IVA', 0.99)).toBeUndefined();
    expect(grade('Stato civile Celibe', 'Celibe', 0.99)).toBeUndefined();
    expect(grade('Il Consiglio di Amministrazione si riunisce', 'Consiglio di Amministrazione', 0.99)).toBeUndefined();
  });

  it('drops names on a line written entirely in capitals (a heading or a form)', () => {
    expect(grade('VERBALE DI ASSEMBLEA STRAORDINARIA\nTesto', 'ASSEMBLEA STRAORDINARIA', 0.99)).toBeUndefined();
    expect(grade('Fornitore: ACME, sede di Torino', 'ACME', 0.99)).toEqual(['ACME', 'medium']);
  });

  it('drops generic words and spans without a name', () => {
    expect(grade('la Banca ha', 'Banca', 0.99)).toBeUndefined();
    expect(grade('la Società S.r.l. ha', 'Società S.r.l.', 0.99)).toBeUndefined();
    expect(grade('della società di', 'della società di', 0.99)).toBeUndefined();
  });

  it('drops titles and currencies the model takes for organizations', () => {
    expect(grade('Il Sig. Avv. Tiziana Esempio', 'Sig. Avv.', 0.99)).toBeUndefined();
    expect(grade('bonifico di EUR 123.114,95', 'EUR', 0.99)).toBeUndefined();
  });
});

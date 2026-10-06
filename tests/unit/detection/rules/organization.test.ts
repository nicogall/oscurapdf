import { describe, expect, it } from 'vitest';
import { organizationDetector } from '../../../../src/contexts/detection/domain/rules/organization';
import { run } from './rule-test-kit';

const found = (text: string): string[] => run(organizationDetector, text).map(([value]) => value);

describe('organization detector (High)', () => {
  it('finds companies by their legal form, dotted or not', () => {
    expect(run(organizationDetector, 'Tra la società Alfa Servizi S.r.l. e la Beta Costruzioni SpA, con Gamma & Figli s.n.c. e Delta Srl.')).toEqual([
      ['Alfa Servizi S.r.l.', 'high'],
      ['Beta Costruzioni SpA', 'high'],
      ['Gamma & Figli s.n.c.', 'high'],
      ['Delta Srl', 'high'],
    ]);
  });

  it('finds foreign legal forms and names written in capitals', () => {
    expect(found('Signed by Initech Ltd. and ACME HOLDINGS LLC, then Umbra GmbH, Globex Inc.')).toEqual(['Initech Ltd.', 'ACME HOLDINGS LLC', 'Umbra GmbH', 'Globex Inc.']);
  });

  it('keeps links inside the name and stops at lower-case words', () => {
    expect(found('la ditta Banca di Credito Cooperativo S.p.A. presso il centro benessere spa di Abano')).toEqual(['Banca di Credito Cooperativo S.p.A.']);
  });

  it('finds institutions by their head word and proper name', () => {
    expect(found('Il Comune di Bari, il Tribunale di Torino, la Regione Lombardia e l’Agenzia delle Entrate.')).toEqual([
      'Comune di Bari',
      'Tribunale di Torino',
      'Regione Lombardia',
      'Agenzia delle Entrate',
    ]);
  });

  it('understands longer institution names, elisions and capitals', () => {
    expect(found("Università degli Studi di Padova; Ministero dell'Interno; OSPEDALE SAN RAFFAELE; Camera di Commercio di Reggio Emilia; Bank of Scotland")).toEqual([
      'Università degli Studi di Padova',
      "Ministero dell'Interno",
      'OSPEDALE SAN RAFFAELE',
      'Camera di Commercio di Reggio Emilia',
      'Bank of Scotland',
    ]);
  });

  it('ignores a head word without a proper name, and form labels', () => {
    expect(found('Il comune ha deliberato. Comune di residenza Milano. COMUNE DI NASCITA PALERMO. Provincia: MI. La banca centrale. Studio di fattibilità.')).toEqual([]);
  });

  it('reports a company whose name starts with a head word once, with its legal form', () => {
    expect(found('Banca Alpina S.p.A. ha sede a Torino')).toEqual(['Banca Alpina S.p.A.']);
  });

  it('knows cooperative forms', () => {
    expect(found('Il consorzio Esempio Trasporti S.c. e la Edile Nord S.c.p.a. hanno partecipato')).toEqual(['Esempio Trasporti S.c.', 'Edile Nord S.c.p.a.']);
  });
});

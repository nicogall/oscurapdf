import { describe, expect, it } from 'vitest';
import { firstNamePairDetector } from '../../../../src/contexts/detection/domain/rules/first-name-pair';
import { run } from './rule-test-kit';

describe('first-name pair rule (rare surnames next to a known first name, High)', () => {
  it('finds "Surname Name" and "Name Surname", in capitals, with particles', () => {
    expect(run(firstNamePairDetector, 'Partecipanti:\nFittizio Marilena, Lo Fittizio Gaetano, INVENTATO ROSARIA')).toEqual([
      ['Fittizio Marilena', 'high'],
      ['Lo Fittizio Gaetano', 'high'],
      ['INVENTATO ROSARIA', 'high'],
    ]);
    expect(run(firstNamePairDetector, 'Il dipendente Immaginario Agata è assegnato. Firmato Anna Russo')).toEqual([
      ['Immaginario Agata', 'high'],
      ['Anna Russo', 'high'],
    ]);
  });

  it('a capitalised word that only starts a sentence is not a surname', () => {
    expect(run(firstNamePairDetector, 'Oggi Mario è venuto. Grazie Mario per il supporto.')).toEqual([]);
    expect(run(firstNamePairDetector, 'Esempio Calogero - assente')).toEqual([['Esempio Calogero', 'high']]);
  });

  it('never turns places, institutions or ordinary words into people', () => {
    const traps = ['Piazza Giuseppe Garibaldi è chiusa.', 'Liceo Enrico Fermi', 'Santa Maria Novella', 'Ospedale Sandro Pertini', 'Norma UNI EN ISO', 'Buon Natale a tutti', 'La Banca Paolo Rossi', 'Corso Giuseppe Mazzini'];
    for (const trap of traps) expect(run(firstNamePairDetector, trap), trap).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { addressDetector } from '../../../../src/contexts/detection/domain/rules/address';
import { run } from './rule-test-kit';

describe('address detector (High)', () => {
  it('finds Italian street addresses with house number, CAP and city', () => {
    expect(run(addressDetector, 'Residente in Via Garibaldi 12, 10122 Torino (TO). Ufficio: Piazza del Popolo, 3.')).toEqual([
      ['Via Garibaldi 12, 10122 Torino (TO)', 'high'],
      ['Piazza del Popolo, 3', 'high'],
    ]);
  });

  it('handles abbreviations, roman numerals and letters after the number', () => {
    expect(run(addressDetector, 'C.so Vittorio Emanuele II 45/B e V.le XX Settembre n. 7')).toEqual([
      ['C.so Vittorio Emanuele II 45/B', 'high'],
      ['V.le XX Settembre n. 7', 'high'],
    ]);
  });

  it('finds English street addresses', () => {
    expect(run(addressDetector, 'Lives at 221 Baker Street, London.')).toEqual([['221 Baker Street', 'high']]);
  });

  it('never continues into the next line (the next form field)', () => {
    expect(run(addressDetector, 'Residente in Via dei Mille 8\nTelefono 02 8765 4321')).toEqual([['Via dei Mille 8', 'high']]);
  });

  it('needs a house number: street names alone are not addresses', () => {
    expect(run(addressDetector, 'La via principale, Piazza Grande e Corso Italia sono chiuse.')).toEqual([]);
  });
  it('recognises abbreviations, lower-case street types and ordinals (2026-10-01)', () => {
    const lines = [
      'Trav. Roma 5', 'trav. Roma 5', 'II Traversa Garibaldi, 3', '3ª Traversa Marina 8', 'via Roma 12', 'viale Europa 4/B', 'Vle Europa 4',
      'P.za Duomo 1', 'L.go Augusto 7', 'Vic. Storto 2', 'Str. Statale 16', 'Fraz. Pianezza 5', 'Piazzetta San Marco 2', 'Calle Larga 22', 'Vico Lungo 3',
    ];
    for (const line of lines) expect(run(addressDetector, `abita in ${line}.`), line).toEqual([[line, 'high']]);
  });

  it('ordinary words are not street types unless capitalised, and "via Email" is not a street', () => {
    expect(run(addressDetector, 'iscritto al corso di Laurea 3, con largo Anticipo 2')).toEqual([]);
    expect(run(addressDetector, 'inviato via Email 3 volte e via PEC 2 volte')).toEqual([]);
    expect(run(addressDetector, 'sede in Corso Vittorio Emanuele II 45')).toEqual([['Corso Vittorio Emanuele II 45', 'high']]);
  });
  it('addresses in capitals, with titles in the street name and a dash before CAP and city', () => {
    expect(run(addressDetector, 'Residente in VIA MONS. ESEMPIO FITTIZIO, 10 - 70100 BARI (BA)')).toEqual([['VIA MONS. ESEMPIO FITTIZIO, 10 - 70100 BARI (BA)', 'high']]);
    expect(run(addressDetector, "VIA S. FRANCESCO D'ASSISI 4")).toEqual([["VIA S. FRANCESCO D'ASSISI 4", 'high']]);
  });

  it('takes "bis" and "ter" after the house number, and a city of several words', () => {
    expect(run(addressDetector, 'residente in Via Cavour 10 bis, Busto Arsizio, e in Piazza Ombra 241, Barcellona Pozzo di Gotto.')).toEqual([
      ['Via Cavour 10 bis, Busto Arsizio', 'high'],
      ['Piazza Ombra 241, Barcellona Pozzo di Gotto', 'high'],
    ]);
  });
});

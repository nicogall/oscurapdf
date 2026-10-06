import { describe, expect, it } from 'vitest';
import { contextualIdDetector } from '../../../../src/contexts/detection/domain/rules/contextual-id';
import { run } from './rule-test-kit';

describe('contextual identifier detector (High: a keyword says it is a code)', () => {
  it('finds id-shaped tokens after a keyword, covering the token only', () => {
    expect(run(contextualIdDetector, 'Patient number: 381729. Pratica n. 2024/17-B. Contract #38172.')).toEqual([
      ['381729', 'high'],
      ['2024/17-B', 'high'],
      ['38172', 'high'],
    ]);
  });

  it('ignores keywords followed by words without digits', () => {
    expect(run(contextualIdDetector, 'Patient number unknown, contract terms apply.')).toEqual([]);
  });

  it('customer, user, utility, document, invoice, order, policy and card numbers (2026-10-01)', () => {
    expect(
      run(contextualIdDetector, 'Codice cliente: 12313123123. POD IT001E12345678. Fattura n. 2026/0451. Ordine n. 784512. Polizza n. 55-1029. N. tessera 00981.'),
    ).toEqual([
      ['12313123123', 'high'],
      ['IT001E12345678', 'high'],
      ['2026/0451', 'high'],
      ['784512', 'high'],
      ['55-1029', 'high'],
      ['00981', 'high'],
    ]);
  });

  it('after a keyword, a number written in groups is covered whole', () => {
    expect(run(contextualIdDetector, 'Codice cliente: 1231 3123 123 - attivo')).toEqual([['1231 3123 123', 'high']]);
  });

  it('a keyword inside another word does not count', () => {
    expect(run(contextualIdDetector, 'iPod 12345678, ipdr 998877')).toEqual([]);
  });

  it('takes the whole identifier, never leaving a piece of it uncovered', () => {
    expect(run(contextualIdDetector, 'Codice cliente: 123123123 1. Rif. 123123123 1 del 2026')).toEqual([
      ['123123123 1', 'high'],
      ['123123123 1', 'high'],
    ]);
  });

  it('a run of more than 20 digits is not one identifier', () => {
    expect(run(contextualIdDetector, 'Codice cliente: 1231 2312 3123 1231 2312 3123')).toEqual([]);
  });

  it('takes the health-card number whole (20 digits)', () => {
    expect(run(contextualIdDetector, 'Tessera sanitaria n. 80380000900123456789')).toEqual([['80380000900123456789', 'high']]);
  });

  it('takes the numbers of acts, tenders and licences, but not of laws (2026-10-04)', () => {
    expect(run(contextualIdDetector, 'ha presentato istanza n. 8809/2021, con determina n. 45/2024, Rep. 35179/2021, CIG 9A12345B67')).toEqual([
      ['8809/2021', 'high'],
      ['45/2024', 'high'],
      ['35179/2021', 'high'],
      ['9A12345B67', 'high'],
    ]);
    expect(run(contextualIdDetector, 'patente di guida n. U1A234567B')).toEqual([['U1A234567B', 'high']]);
    expect(run(contextualIdDetector, 'ai sensi della legge n. 241/1990 e del D.Lgs. n. 50/2016')).toEqual([]);
  });

  it('takes case and delivery-note numbers', () => {
    expect(run(contextualIdDetector, 'la causa n. RG 57822/2022 e il reclamo n. DDT 14238/2023')).toEqual([
      ['57822/2022', 'high'],
      ['14238/2023', 'high'],
    ]);
  });
});

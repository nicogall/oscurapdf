import { describe, expect, it } from 'vitest';
import { longNumberDetector } from '../../../../src/contexts/detection/domain/rules/long-number';
import { run } from './rule-test-kit';

describe('compact number detector (8–16 digits without spaces, High)', () => {
  it('covers compact codes, dashes allowed', () => {
    expect(run(longNumberDetector, 'Pratica 20240317, ordine 784512369, fattura 2026-00451, rif. 02-1234-5678.')).toEqual([
      ['20240317', 'high'],
      ['784512369', 'high'],
      ['2026-00451', 'high'],
      ['02-1234-5678', 'high'],
    ]);
  });

  it('does not suggest digits spread over spaces, nor very long runs (2026-10-01)', () => {
    expect(run(longNumberDetector, 'ordine 4532 0151 1283 0366, serie 12 34 56 78 90 12 34, lotto 12345678901234567890')).toEqual([]);
    expect(run(longNumberDetector, 'tabella 2024 12345678 2025')).toEqual([]);
  });

  it('ignores short numbers, dates and amounts with decimals', () => {
    expect(run(longNumberDetector, 'Anno 2024, data 12/03/2024, totale 1.250.000,00 EUR, qty 1234567.')).toEqual([]);
  });

  it('ignores digits glued to letters (they belong to codes handled elsewhere)', () => {
    expect(run(longNumberDetector, 'IT60X0542811101000000123456')).toEqual([]);
  });
});

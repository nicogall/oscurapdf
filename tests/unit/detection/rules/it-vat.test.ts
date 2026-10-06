import { describe, expect, it } from 'vitest';
import { itVatDetector } from '../../../../src/contexts/detection/domain/rules/it-vat';
import { run } from './rule-test-kit';

describe('partita IVA detector (only with context)', () => {
  it('a valid number after a VAT keyword is High', () => {
    expect(run(itVatDetector, 'P.IVA 01234567897')).toEqual([['01234567897', 'high']]);
    expect(run(itVatDetector, 'VAT number: IT01234567897')).toEqual([['IT01234567897', 'high']]);
  });

  it('without a keyword it is not reported as a VAT number (the long-number rule covers it)', () => {
    expect(run(itVatDetector, 'code 01234567897')).toEqual([]);
  });

  it('a wrong check digit is still a VAT number right after the keyword (2026-10-04)', () => {
    expect(run(itVatDetector, 'P.IVA 01234567890')).toEqual([['01234567890', 'high']]);
    expect(run(itVatDetector, 'la società (P.IVA IT01234567890), rappresentata')).toEqual([['IT01234567890', 'high']]);
  });

  it('a wrong check digit far from the keyword is not reported as a VAT number', () => {
    expect(run(itVatDetector, 'P.IVA 01234567897; errata: 01234567890')).toEqual([['01234567897', 'high']]);
  });
});

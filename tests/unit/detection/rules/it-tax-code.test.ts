import { describe, expect, it } from 'vitest';
import { itTaxCodeDetector } from '../../../../src/contexts/detection/domain/rules/it-tax-code';
import { run } from './rule-test-kit';

describe('codice fiscale detector (High if valid)', () => {
  it('finds valid codes including omocodia and lowercase', () => {
    expect(run(itTaxCodeDetector, 'CF: RSSMRA85T10A562S, rssmra85t10a56nh.')).toEqual([
      ['RSSMRA85T10A562S', 'high'],
      ['rssmra85t10a56nh', 'high'],
    ]);
  });

  it('rejects near misses: a wrong shape, or a code glued to other characters', () => {
    expect(run(itTaxCodeDetector, 'RSSMRA85T10A562SX ABCDEFGHIJKLMNOP RSSMRA85Z10A562S')).toEqual([]);
  });

  it('a wrong check character is still a tax code: High after a keyword, else Medium (2026-10-04)', () => {
    expect(run(itTaxCodeDetector, 'Codice fiscale: RSSMRA85T10A562T')).toEqual([['RSSMRA85T10A562T', 'high']]);
    expect(run(itTaxCodeDetector, 'residente a Bari (BA), CF RSSMRA85T10A562T.')).toEqual([['RSSMRA85T10A562T', 'high']]);
    expect(run(itTaxCodeDetector, 'il codice RSSMRA85T10A562T risulta errato')).toEqual([['RSSMRA85T10A562T', 'medium']]);
  });

  it('a wrong check character is not accepted when the code is written with spaces', () => {
    expect(run(itTaxCodeDetector, 'Codice fiscale: RSSMRA 85T10 A562T')).toEqual([]);
  });

  it('finds codes written with spaces: in groups, or one character per box (2026-10-01)', () => {
    expect(run(itTaxCodeDetector, 'CF RSSMRA 85T10 A562S.')).toEqual([['RSSMRA 85T10 A562S', 'high']]);
    expect(run(itTaxCodeDetector, 'Codice fiscale: R S S M R A 8 5 T 1 0 A 5 6 2 S')).toEqual([['R S S M R A 8 5 T 1 0 A 5 6 2 S', 'high']]);
    expect(run(itTaxCodeDetector, 'codice fiscale  RSSMRA85T10   A562S fine')).toEqual([['RSSMRA85T10   A562S', 'high']]);
  });

  it('a near miss starting in the previous word never hides the real code', () => {
    expect(run(itTaxCodeDetector, 'fiscale rssmra85t10a562s')).toEqual([['rssmra85t10a562s', 'high']]);
  });

  it('spaced codes still need the right check character', () => {
    expect(run(itTaxCodeDetector, 'R S S M R A 8 5 T 1 0 A 5 6 2 T')).toEqual([]);
  });
});

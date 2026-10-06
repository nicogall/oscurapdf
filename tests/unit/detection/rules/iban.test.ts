import { describe, expect, it } from 'vitest';
import { ibanDetector } from '../../../../src/contexts/detection/domain/rules/iban';
import { run } from './rule-test-kit';

describe('IBAN detector (High if valid, else not reported)', () => {
  it('finds compact and spaced IBANs', () => {
    expect(run(ibanDetector, 'IBAN: IT60X0542811101000000123456 or IT60 X054 2811 1010 0000 0123 456 and more')).toEqual([
      ['IT60X0542811101000000123456', 'high'],
      ['IT60 X054 2811 1010 0000 0123 456', 'high'],
    ]);
  });

  it('does not report a wrong length or a wrong national shape', () => {
    expect(run(ibanDetector, 'IT60X054281110100000012345 and IT61 0542811101000000123456X and IT6100542811101000000123456')).toEqual([]);
  });

  it('a wrong check with the right shape is still an IBAN: High after a keyword, else Medium (2026-10-04)', () => {
    expect(run(ibanDetector, 'bonifico IBAN IT61X0542811101000000123456 di 10 euro')).toEqual([['IT61X0542811101000000123456', 'high']]);
    expect(run(ibanDetector, 'Riferimento IT61X0542811101000000123456')).toEqual([['IT61X0542811101000000123456', 'medium']]);
  });

  it('ignores near misses glued to other letters', () => {
    expect(run(ibanDetector, 'xIT60X0542811101000000123456')).toEqual([]);
  });
});

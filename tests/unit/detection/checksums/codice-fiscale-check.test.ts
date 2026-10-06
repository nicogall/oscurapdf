import { describe, expect, it } from 'vitest';
import { isValidCodiceFiscale } from '../../../../src/contexts/detection/domain/checksums/codice-fiscale-check';

describe('codice fiscale check character', () => {
  it('accepts a valid code (hand-verified: odd 80 + even 42 = 122 → S)', () => {
    expect(isValidCodiceFiscale('RSSMRA85T10A562S')).toBe(true);
  });

  it('accepts omocodia (digit 2 → N changes the check to H)', () => {
    expect(isValidCodiceFiscale('RSSMRA85T10A56NH')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isValidCodiceFiscale('rssmra85t10a562s')).toBe(true);
  });

  it.each([
    ['wrong check character', 'RSSMRA85T10A562T'],
    ['invalid month letter', 'RSSMRA85Z10A562S'],
    ['too short', 'RSSMRA85T10A562'],
    ['letter where omocodia is not allowed', 'RSSMRA85T10A5X2S'],
  ])('rejects %s', (_label, code) => {
    expect(isValidCodiceFiscale(code)).toBe(false);
  });
});

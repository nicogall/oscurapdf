import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { isValidIban } from '../../../../src/contexts/detection/domain/checksums/mod97';

describe('IBAN mod-97 (ISO 13616) with country lengths', () => {
  it.each(['IT60X0542811101000000123456', 'GB82WEST12345698765432', 'DE89370400440532013000', 'FR1420041010050500013M02606'])('accepts %s', (iban) => {
    expect(isValidIban(iban)).toBe(true);
  });

  it.each([
    ['wrong check digits', 'IT61X0542811101000000123456'],
    ['wrong length for the country', 'IT60X054281110100000012345'],
    ['unknown country', 'ZZ60X0542811101000000123456'],
    ['not alphanumeric', 'IT60X05428111010000001234-6'],
  ])('rejects %s', (_label, iban) => {
    expect(isValidIban(iban)).toBe(false);
  });

  it('detects every single-character substitution in the BBAN', () => {
    const valid = 'IT60X0542811101000000123456';
    fc.assert(
      fc.property(fc.integer({ min: 5, max: valid.length - 1 }), fc.integer({ min: 1, max: 9 }), (at, delta) => {
        const digit = valid[at];
        if (digit === undefined || !/\d/.test(digit)) return true;
        const changed = valid.slice(0, at) + String((Number(digit) + delta) % 10) + valid.slice(at + 1);
        return !isValidIban(changed);
      }),
    );
  });
});

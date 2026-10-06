import { describe, expect, it } from 'vitest';
import { isValidIban } from '../../src/contexts/detection/domain/checksums/mod97';
import { luhnValid } from '../../src/contexts/detection/domain/checksums/luhn';
import { ibanFor, syntheticIdentifiers } from './synthetic-identifiers';

describe('synthetic identifiers', () => {
  it('computes correct IBAN check digits (matches the published example)', () => {
    expect(ibanFor('IT', 'X0542811101000000123456')).toBe('IT60X0542811101000000123456');
  });

  it('generates only valid IBANs and cards, deterministically', () => {
    const a = syntheticIdentifiers(20);
    expect(a.ibans.every(isValidIban)).toBe(true);
    expect(a.cards.every(luhnValid)).toBe(true);
    expect(syntheticIdentifiers(20)).toEqual(a);
  });
});

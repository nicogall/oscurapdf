import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { isValidPartitaIva } from '../../../../src/contexts/detection/domain/checksums/partita-iva-check';

describe('partita IVA checksum', () => {
  it('accepts a valid number', () => {
    expect(isValidPartitaIva('01234567897')).toBe(true);
  });

  it.each(['01234567890', '0123456789', '012345678977', '0123456789a'])('rejects %s', (n) => {
    expect(isValidPartitaIva(n)).toBe(false);
  });

  it('catches every single-digit error', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), fc.integer({ min: 1, max: 9 }), (at, delta) => {
        const valid = '01234567897';
        const changed = valid.slice(0, at) + String((Number(valid[at]) + delta) % 10) + valid.slice(at + 1);
        return !isValidPartitaIva(changed);
      }),
    );
  });
});

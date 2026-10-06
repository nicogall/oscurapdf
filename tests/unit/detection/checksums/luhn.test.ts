import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { luhnValid } from '../../../../src/contexts/detection/domain/checksums/luhn';

describe('Luhn', () => {
  it.each(['4111111111111111', '5500000000000004', '378282246310005', '6011111111111117'])('accepts %s', (n) => {
    expect(luhnValid(n)).toBe(true);
  });

  it.each(['4111111111111112', '1234567812345678', '', 'abcd'])('rejects %s', (n) => {
    expect(luhnValid(n)).toBe(false);
  });

  it('catches every single-digit error', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 15 }), fc.integer({ min: 1, max: 9 }), (at, delta) => {
        const valid = '4111111111111111';
        const changed = valid.slice(0, at) + String((Number(valid[at]) + delta) % 10) + valid.slice(at + 1);
        return !luhnValid(changed);
      }),
    );
  });
});

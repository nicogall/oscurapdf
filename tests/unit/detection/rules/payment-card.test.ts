import { describe, expect, it } from 'vitest';
import { paymentCardDetector } from '../../../../src/contexts/detection/domain/rules/payment-card';
import { run } from './rule-test-kit';

describe('payment card detector (High if valid)', () => {
  it('finds cards with spaces or dashes', () => {
    expect(run(paymentCardDetector, 'Card 4111 1111 1111 1111, Amex 3782-822463-10005.')).toEqual([
      ['4111 1111 1111 1111', 'high'],
      ['3782-822463-10005', 'high'],
    ]);
  });

  it('rejects invalid Luhn and unknown issuer prefixes', () => {
    expect(run(paymentCardDetector, '4111 1111 1111 1112 and 1234 5678 1234 5670')).toEqual([]);
  });

  it('finds a valid card followed by more digits', () => {
    expect(run(paymentCardDetector, '4111 1111 1111 1111 2026')).toEqual([['4111 1111 1111 1111', 'high']]);
  });

  it('a number called a card is taken whole even when its check fails (2026-10-04)', () => {
    expect(run(paymentCardDetector, 'addebito sulla carta di credito 4139 6568 7203 2017 del cliente')).toEqual([['4139 6568 7203 2017', 'high']]);
    expect(run(paymentCardDetector, 'numero 4139 6568 7203 2017 del cliente')).toEqual([]);
  });

  it('never takes digits glued to letters (a piece of an IBAN)', () => {
    expect(run(paymentCardDetector, 'IT06L4111111111111111688623')).toEqual([]);
  });
});

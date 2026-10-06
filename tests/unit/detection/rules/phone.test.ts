import { describe, expect, it } from 'vitest';
import { phoneDetector } from '../../../../src/contexts/detection/domain/rules/phone';
import { run } from './rule-test-kit';

describe('phone detector (only when sure: + prefix or a keyword)', () => {
  it('international numbers with + are High', () => {
    expect(run(phoneDetector, 'Call +39 333 123 4567 or +44 20 7946 0958.')).toEqual([
      ['+39 333 123 4567', 'high'],
      ['+44 20 7946 0958', 'high'],
    ]);
  });

  it('Italian numbers are High only after a keyword', () => {
    expect(run(phoneDetector, 'Tel. 02 12345678, Cell: 347-123-4567')).toEqual([
      ['02 12345678', 'high'],
      ['347-123-4567', 'high'],
    ]);
  });

  it('Italian landlines in grouped form after a keyword', () => {
    expect(run(phoneDetector, 'Telefono 02 8765 4321')).toEqual([['02 8765 4321', 'high']]);
  });

  it('numbers without a + or keyword are left to the long-number rule', () => {
    expect(run(phoneDetector, 'Quantità 3334567890, lotto 0045 1234 5678, ufficio 02 12345678')).toEqual([]);
  });
});

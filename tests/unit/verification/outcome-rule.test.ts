import { describe, expect, expectTypeOf, it } from 'vitest';
import { buildReport, type FailureLocator, type VerificationCheck } from '@verification';

const check = (passed: boolean): VerificationCheck => ({ kind: 'validPdf', passed, failures: passed ? [] : [{}] });

describe('outcome rule: verified if and only if every check passed', () => {
  it('is verified when all checks pass', () => {
    expect(buildReport(3, [check(true), check(true)])).toEqual({ itemsRemoved: 3, checks: [check(true), check(true)], outcome: 'verified' });
  });

  it('is failed when any check fails', () => {
    expect(buildReport(3, [check(true), check(false)]).outcome).toBe('failed');
  });

  it('is failed when there are no checks at all', () => {
    expect(buildReport(0, []).outcome).toBe('failed');
  });

  it('FailureLocator can never carry text', () => {
    expectTypeOf<FailureLocator>().toEqualTypeOf<{ readonly page?: number; readonly redactionIndex?: number }>();
  });
});

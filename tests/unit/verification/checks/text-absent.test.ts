import { describe, expect, it } from 'vitest';
import { textAbsentCheck } from '@verification';

describe('textAbsentCheck (same rule as occurrence matching)', () => {
  it('passes when no redacted text remains', () => {
    expect(textAbsentCheck([['The agreement between  and '], ['page two']], ['acme holdings ltd.']).passed).toBe(true);
  });

  it('fails case-insensitively and across line breaks, locating page and redaction', () => {
    const check = textAbsentCheck([['clean', 'ACME\nHoldings Ltd. again']], ['rossi', 'acme holdings ltd.']);
    expect(check.passed).toBe(false);
    expect(check.failures).toEqual([{ page: 1, redactionIndex: 1 }]);
  });

  it('checks every engine source', () => {
    const check = textAbsentCheck([['clean'], ['mario rossi']], ['mario rossi']);
    expect(check.failures).toEqual([{ page: 0, redactionIndex: 0 }]);
  });

  it('does not flag partial words (whole-word rule)', () => {
    expect(textAbsentCheck([['Rossini']], ['rossi']).passed).toBe(true);
  });
});

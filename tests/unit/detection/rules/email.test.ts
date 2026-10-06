import { describe, expect, it } from 'vitest';
import { emailDetector } from '../../../../src/contexts/detection/domain/rules/email';
import { run } from './rule-test-kit';

describe('email detector (High)', () => {
  it('finds addresses with original casing and offsets', () => {
    expect(run(emailDetector, 'Write to John.Smith@Example.com or a.b+tag@mail.co.uk.')).toEqual([
      ['John.Smith@Example.com', 'high'],
      ['a.b+tag@mail.co.uk', 'high'],
    ]);
  });

  it('ignores near misses', () => {
    expect(run(emailDetector, 'user@localhost, @handle, name@domain.c, not-an-email')).toEqual([]);
  });

  it('sees through full-width characters (NFKC)', () => {
    expect(run(emailDetector, 'ｊｏｈｎ＠ｅｘａｍｐｌｅ．ｃｏｍ')).toHaveLength(1);
  });
});

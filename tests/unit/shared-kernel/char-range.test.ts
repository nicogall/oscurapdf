import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { andThen, createCharRange, err, isErr, mapResult, newEntityId, ok, rangesOverlap } from '@shared-kernel';

describe('CharRange', () => {
  it('accepts 0 ≤ start < end', () => {
    fc.assert(
      fc.property(fc.nat(1000), fc.integer({ min: 1, max: 1000 }), (start, len) => createCharRange(start, start + len).ok),
    );
  });

  it('rejects empty, reversed, negative or fractional ranges', () => {
    expect(createCharRange(3, 3).ok).toBe(false);
    expect(createCharRange(4, 3).ok).toBe(false);
    expect(createCharRange(-1, 3).ok).toBe(false);
    expect(createCharRange(0.5, 3).ok).toBe(false);
  });

  it('detects overlap', () => {
    expect(rangesOverlap({ start: 0, end: 5 }, { start: 4, end: 8 })).toBe(true);
    expect(rangesOverlap({ start: 0, end: 5 }, { start: 5, end: 8 })).toBe(false);
  });
});

describe('EntityId', () => {
  it('is random and never derived from content', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newEntityId<'Test'>()));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('Result', () => {
  it('maps and chains only successful values', () => {
    const doubled = mapResult(ok(2), (n) => n * 2);
    expect(doubled).toEqual(ok(4));
    expect(mapResult(err('bad'), (n: number) => n * 2)).toEqual(err('bad'));
    expect(andThen(ok(2), (n) => (n > 1 ? ok(n) : err('small')))).toEqual(ok(2));
    expect(isErr(andThen(ok(0), (n) => (n > 1 ? ok(n) : err('small'))))).toBe(true);
    expect(andThen(err('first'), () => ok(1))).toEqual(err('first'));
  });
});

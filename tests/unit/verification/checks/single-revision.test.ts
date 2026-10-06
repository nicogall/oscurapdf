import { describe, expect, it } from 'vitest';
import { singleRevisionCheck } from '@verification';

describe('singleRevisionCheck', () => {
  it('passes only for exactly one revision', () => {
    expect(singleRevisionCheck(1).passed).toBe(true);
    expect(singleRevisionCheck(2).passed).toBe(false);
    expect(singleRevisionCheck(0).passed).toBe(false);
  });
});

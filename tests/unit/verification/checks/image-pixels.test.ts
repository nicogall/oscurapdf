import { describe, expect, it } from 'vitest';
import { imagePixelCheck } from '@verification';

describe('imagePixelCheck: pixels under areas are uniform (the black fill)', () => {
  it('passes when every sample is uniform or there are no images', () => {
    expect(imagePixelCheck([]).passed).toBe(true);
    expect(imagePixelCheck([{ page: 0, uniform: true }]).passed).toBe(true);
  });

  it('fails for each non-uniform sample', () => {
    expect(imagePixelCheck([{ page: 0, uniform: true }, { page: 2, uniform: false }]).failures).toEqual([{ page: 2 }]);
  });
});

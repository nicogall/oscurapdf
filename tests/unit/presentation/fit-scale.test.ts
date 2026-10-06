import { describe, expect, it } from 'vitest';
import { fitScale, VIEWER_SCALE } from '../../../src/presentation/viewer/fit-scale';

describe('fitScale', () => {
  it('keeps the usual scale when the page fits', () => {
    expect(fitScale(1200, 595)).toBe(VIEWER_SCALE);
  });

  it('shrinks the page to the width available on a narrow screen', () => {
    expect(fitScale(357, 595)).toBeCloseTo(0.6);
  });

  it('never goes below a readable minimum', () => {
    expect(fitScale(50, 595)).toBe(0.3);
  });

  it('keeps the usual scale while nothing has been measured', () => {
    expect(fitScale(undefined, 595)).toBe(VIEWER_SCALE);
    expect(fitScale(0, 595)).toBe(VIEWER_SCALE);
    expect(fitScale(400, 0)).toBe(VIEWER_SCALE);
  });
});

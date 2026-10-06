import { describe, expect, it } from 'vitest';
import { validPdfCheck } from '@verification';

describe('validPdfCheck: opens in both engines, and the page count equals the input', () => {
  it('passes when both engines open it with the input page count', () => {
    expect(validPdfCheck({ expectedPageCount: 2, independentPageCount: 2, inspectorPageCount: 2 }).passed).toBe(true);
  });

  it('fails when an engine cannot open it or counts differ', () => {
    expect(validPdfCheck({ expectedPageCount: 2, inspectorPageCount: 2 }).passed).toBe(false);
    expect(validPdfCheck({ expectedPageCount: 2, independentPageCount: 2 }).passed).toBe(false);
    expect(validPdfCheck({ expectedPageCount: 2, independentPageCount: 1, inspectorPageCount: 2 }).passed).toBe(false);
  });
});

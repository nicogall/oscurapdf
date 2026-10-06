import { describe, expect, it } from 'vitest';
import type { PageIndex } from '@shared-kernel';
import { geometryCheck } from '@verification';

const areas = new Map([[0 as PageIndex, [{ box: { x: 10, y: 10, width: 50, height: 10 }, origin: 'text' as const }]]]);

describe('geometryCheck: no remaining glyph inside a redaction area', () => {
  it('passes when glyphs only touch the edges', () => {
    const glyphs = [
      { page: 0, box: { x: 0, y: 10, width: 10, height: 10 } },
      { page: 0, box: { x: 60, y: 10, width: 10, height: 10 } },
    ];
    expect(geometryCheck(glyphs, areas).passed).toBe(true);
  });

  it('fails when a glyph centre lies inside an area on the same page', () => {
    const check = geometryCheck([{ page: 0, box: { x: 20, y: 12, width: 5, height: 6 } }], areas);
    expect(check).toEqual({ kind: 'geometry', passed: false, failures: [{ page: 0 }] });
  });

  it('ignores glyphs on other pages', () => {
    expect(geometryCheck([{ page: 1, box: { x: 20, y: 12, width: 5, height: 6 } }], areas).passed).toBe(true);
  });
});

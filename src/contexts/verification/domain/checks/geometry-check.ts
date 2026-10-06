import type { BoundingBox, PageIndex } from '@shared-kernel';
import type { PlannedArea } from '@shared-kernel/published';
import { checkFrom, type VerificationCheck } from '../verification-check';

export interface GlyphBox {
  readonly page: number;
  readonly box: BoundingBox;
}

const centreInside = (glyph: BoundingBox, area: BoundingBox): boolean => {
  const cx = glyph.x + glyph.width / 2;
  const cy = glyph.y + glyph.height / 2;
  return cx > area.x && cx < area.x + area.width && cy > area.y && cy < area.y + area.height;
};

/** No remaining glyph has its centre inside a redaction area on its page. */
export const geometryCheck = (
  glyphs: readonly GlyphBox[],
  areasByPage: ReadonlyMap<PageIndex, readonly PlannedArea[]>,
): VerificationCheck => {
  const offending = glyphs.filter((glyph) =>
    (areasByPage.get(glyph.page as PageIndex) ?? []).some((area) => centreInside(glyph.box, area.box)),
  );
  const pages = [...new Set(offending.map((glyph) => glyph.page))];
  return checkFrom('geometry', pages.map((page) => ({ page })));
};

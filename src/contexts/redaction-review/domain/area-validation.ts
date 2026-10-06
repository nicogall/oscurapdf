import { err, ok, type PageArea, type Result } from '@shared-kernel';

export interface PageSize {
  readonly width: number;
  readonly height: number;
}

/** Sub-point rounding from screen coordinates is tolerated. */
const TOLERANCE = 0.5;

/** "The box lies within that page's size" (data-model: PageArea invariant, checked by Review). */
export const validateArea = (area: PageArea, page: PageSize): Result<PageArea, 'invalidArea'> => {
  const { x, y, width, height } = area.box;
  const inside =
    width > 0 &&
    height > 0 &&
    x >= -TOLERANCE &&
    y >= -TOLERANCE &&
    x + width <= page.width + TOLERANCE &&
    y + height <= page.height + TOLERANCE;
  return inside ? ok(area) : err('invalidArea');
};

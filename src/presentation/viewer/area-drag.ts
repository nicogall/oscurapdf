import type { BoundingBox } from '@shared-kernel';
import { screenToPage, type Point } from './page-geometry';

export const MIN_DRAG_POINTS = 4;

export interface PageSize {
  readonly width: number;
  readonly height: number;
}

const clamp = (value: number, max: number): number => Math.min(Math.max(value, 0), max);

/**
 * Screen drag (pixels relative to the page element) → page-space box, clipped to the page.
 * A drag shorter than 4 pt is ignored; thin boxes are kept at least 1 pt thick.
 */
export const dragToBox = (start: Point, end: Point, scale: number, page: PageSize): BoundingBox | undefined => {
  const a = screenToPage(start, scale);
  const b = screenToPage(end, scale);
  if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_DRAG_POINTS) return undefined;
  const x0 = clamp(Math.min(a.x, b.x), page.width);
  const y0 = clamp(Math.min(a.y, b.y), page.height);
  const x1 = clamp(Math.max(a.x, b.x), page.width);
  const y1 = clamp(Math.max(a.y, b.y), page.height);
  const width = Math.max(x1 - x0, 1);
  const height = Math.max(y1 - y0, 1);
  return { x: Math.min(x0, page.width - width), y: Math.min(y0, page.height - height), width, height };
};

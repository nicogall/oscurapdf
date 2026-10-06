import type { BoundingBox } from '@shared-kernel';

export interface ScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Page space (points, top-left origin) → screen pixels at `scale`. */
export const pageToScreen = (box: BoundingBox, scale: number): ScreenRect => ({
  left: box.x * scale,
  top: box.y * scale,
  width: box.width * scale,
  height: box.height * scale,
});

/** Screen pixels (relative to the page element) → page space. */
export const screenToPage = (point: Point, scale: number): Point => ({ x: point.x / scale, y: point.y / scale });

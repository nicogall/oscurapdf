import { err, ok, type Result } from '../result';

/** Rectangle in page space: points, origin top-left, y downward, rotation applied. */
export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const createBoundingBox = (
  x: number,
  y: number,
  width: number,
  height: number,
): Result<BoundingBox, 'invalidBoundingBox'> => {
  const finite = [x, y, width, height].every(Number.isFinite);
  return finite && width > 0 && height > 0 ? ok({ x, y, width, height }) : err('invalidBoundingBox');
};

export const boxesIntersect = (a: BoundingBox, b: BoundingBox): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export const boxContains = (outer: BoundingBox, inner: BoundingBox, tolerance = 0): boolean =>
  inner.x >= outer.x - tolerance &&
  inner.y >= outer.y - tolerance &&
  inner.x + inner.width <= outer.x + outer.width + tolerance &&
  inner.y + inner.height <= outer.y + outer.height + tolerance;

export const unionOfBoxes = (boxes: readonly BoundingBox[]): BoundingBox | undefined => {
  if (boxes.length === 0) return undefined;
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

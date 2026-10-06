import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  boxContains,
  boxesIntersect,
  createBoundingBox,
  createPageArea,
  createPageIndex,
  unionOfBoxes,
} from '@shared-kernel';

describe('PageIndex', () => {
  it('accepts integers ≥ 0', () => {
    fc.assert(fc.property(fc.nat(), (n) => createPageIndex(n).ok));
  });

  it('rejects negative or non-integer values', () => {
    expect(createPageIndex(-1).ok).toBe(false);
    expect(createPageIndex(1.5).ok).toBe(false);
    expect(createPageIndex(Number.NaN).ok).toBe(false);
  });
});

describe('BoundingBox', () => {
  const finite = fc.double({ min: -1e6, max: 1e6, noNaN: true });
  const positive = fc.double({ min: 0.001, max: 1e6, noNaN: true });

  it('accepts finite coordinates with positive width and height', () => {
    fc.assert(fc.property(finite, finite, positive, positive, (x, y, w, h) => createBoundingBox(x, y, w, h).ok));
  });

  it('rejects zero or negative sizes and non-finite values', () => {
    expect(createBoundingBox(0, 0, 0, 1).ok).toBe(false);
    expect(createBoundingBox(0, 0, 1, -1).ok).toBe(false);
    expect(createBoundingBox(Number.POSITIVE_INFINITY, 0, 1, 1).ok).toBe(false);
  });

  it('computes intersection, containment and union', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 5, y: 5, width: 10, height: 10 };
    const c = { x: 20, y: 20, width: 1, height: 1 };
    expect(boxesIntersect(a, b)).toBe(true);
    expect(boxesIntersect(a, c)).toBe(false);
    expect(boxContains(a, { x: 1, y: 1, width: 2, height: 2 })).toBe(true);
    expect(boxContains(a, b)).toBe(false);
    expect(unionOfBoxes([a, b])).toEqual({ x: 0, y: 0, width: 15, height: 15 });
  });

  it('union of an empty list is undefined', () => {
    expect(unionOfBoxes([])).toBeUndefined();
  });

  it('union always contains every input box', () => {
    const box = fc.record({ x: finite, y: finite, width: positive, height: positive });
    fc.assert(
      fc.property(fc.array(box, { minLength: 1, maxLength: 8 }), (boxes) => {
        const union = unionOfBoxes(boxes);
        return union !== undefined && boxes.every((b) => boxContains(union, b, 1e-6));
      }),
    );
  });
});

describe('PageArea', () => {
  it('pairs a valid page index with a valid box', () => {
    const area = createPageArea(2, { x: 1, y: 1, width: 1, height: 1 });
    expect(area.ok && area.value.page).toBe(2);
    expect(createPageArea(-1, { x: 1, y: 1, width: 1, height: 1 }).ok).toBe(false);
    expect(createPageArea(0, { x: 1, y: 1, width: 0, height: 1 }).ok).toBe(false);
  });
});

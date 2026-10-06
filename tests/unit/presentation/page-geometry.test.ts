import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { pageToScreen, screenToPage } from '../../../src/presentation/viewer/page-geometry';

describe('page geometry', () => {
  it('scales page-space boxes to screen pixels', () => {
    expect(pageToScreen({ x: 10, y: 20, width: 30, height: 40 }, 2)).toEqual({ left: 20, top: 40, width: 60, height: 80 });
  });

  it('converts screen points back to page space', () => {
    expect(screenToPage({ x: 20, y: 40 }, 2)).toEqual({ x: 10, y: 20 });
  });

  it('round-trips for any positive scale', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1000, noNaN: true }), fc.double({ min: 0.1, max: 8, noNaN: true }), (v, scale) => {
        const screen = pageToScreen({ x: v, y: v, width: 1, height: 1 }, scale);
        const back = screenToPage({ x: screen.left, y: screen.top }, scale);
        return Math.abs(back.x - v) < 1e-9 && Math.abs(back.y - v) < 1e-9;
      }),
    );
  });
});

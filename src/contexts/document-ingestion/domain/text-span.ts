import type { BoundingBox, CharRange, PageIndex } from '@shared-kernel';

/**
 * A run of characters on one line of one page. `charBoxes` has one box per UTF-16 code unit,
 * so `charBoxes.length === range.end - range.start`.
 */
export interface TextSpan {
  readonly page: PageIndex;
  readonly range: CharRange;
  readonly line: number;
  readonly charBoxes: readonly BoundingBox[];
}

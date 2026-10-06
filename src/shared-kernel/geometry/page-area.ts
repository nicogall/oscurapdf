import { andThen, mapResult, type Result } from '../result';
import { createBoundingBox, type BoundingBox } from './bounding-box';
import { createPageIndex, type PageIndex } from './page-index';

/** A box on a specific page. Whether it fits the page is checked by the owning context. */
export interface PageArea {
  readonly page: PageIndex;
  readonly box: BoundingBox;
}

export const createPageArea = (
  page: number,
  box: BoundingBox,
): Result<PageArea, 'invalidPageIndex' | 'invalidBoundingBox'> =>
  andThen(createPageIndex(page), (pageIndex) =>
    mapResult(createBoundingBox(box.x, box.y, box.width, box.height), (valid) => ({ page: pageIndex, box: valid })),
  );

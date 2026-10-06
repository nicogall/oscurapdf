import { createBoundingBox, type BoundingBox } from '../geometry/bounding-box';
import { mapResult, type Result } from '../result';

/** `origin` selects the line-art mode: text → fully covered, area → touched (research R1). */
export type AreaOrigin = 'text' | 'area';

export interface PlannedArea {
  readonly box: BoundingBox;
  readonly origin: AreaOrigin;
}

export const createPlannedArea = (box: BoundingBox, origin: AreaOrigin): Result<PlannedArea, 'invalidBoundingBox'> =>
  mapResult(createBoundingBox(box.x, box.y, box.width, box.height), (valid) => ({ box: valid, origin }));

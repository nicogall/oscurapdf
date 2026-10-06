import { createPageIndex, err, type Result } from '@shared-kernel';
import type { PageBitmap, PageRasterizer } from './ports/page-rasterizer';

export class RenderPage {
  constructor(private readonly rasterizer: PageRasterizer) {}

  execute(page: number, scale: number): Promise<Result<PageBitmap, 'renderFailed'>> {
    const index = createPageIndex(page);
    if (!index.ok || !(scale > 0)) return Promise.resolve(err('renderFailed'));
    return this.rasterizer.render(index.value, scale);
  }
}

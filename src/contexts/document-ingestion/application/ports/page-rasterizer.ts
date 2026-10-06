import type { PageIndex, Result } from '@shared-kernel';

export interface PageBitmap {
  readonly width: number;
  readonly height: number;
  readonly image: ImageBitmap;
}

export interface PageRasterizer {
  render(page: PageIndex, scale: number): Promise<Result<PageBitmap, 'renderFailed'>>;
}

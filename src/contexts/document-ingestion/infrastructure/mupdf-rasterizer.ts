import * as mupdf from 'mupdf';
import { err, ok, type PageIndex, type Result } from '@shared-kernel';
import type { PageBitmap, PageRasterizer } from '../application/ports/page-rasterizer';
import type { MuPdfSession } from './mupdf-session';

export interface RgbaPixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export type BitmapFactory = (pixels: RgbaPixels) => Promise<ImageBitmap>;

export const browserBitmapFactory: BitmapFactory = (pixels) =>
  createImageBitmap(new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height));

const toRgba = (pixmap: mupdf.Pixmap): RgbaPixels => {
  const width = pixmap.getWidth();
  const height = pixmap.getHeight();
  const source = pixmap.getPixels();
  const stride = pixmap.getStride();
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const from = row * stride + col * 3;
      data.set([source[from] ?? 0, source[from + 1] ?? 0, source[from + 2] ?? 0, 255], (row * width + col) * 4);
    }
  }
  return { width, height, data };
};

/** Renders pages of the session's document with MuPDF (white background, RGB). */
export class MuPdfRasterizer implements PageRasterizer {
  constructor(
    private readonly session: MuPdfSession,
    private readonly toBitmap: BitmapFactory = browserBitmapFactory,
  ) {}

  async render(page: PageIndex, scale: number): Promise<Result<PageBitmap, 'renderFailed'>> {
    const pixels = this.renderPixels(page, scale);
    if (pixels === undefined) return err('renderFailed');
    return ok({ width: pixels.width, height: pixels.height, image: await this.toBitmap(pixels) });
  }

  private renderPixels(page: PageIndex, scale: number): RgbaPixels | undefined {
    const document = this.session.current();
    if (document === undefined || page >= document.countPages()) return undefined;
    const loaded = document.loadPage(page);
    const pixmap = loaded.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false);
    const pixels = toRgba(pixmap);
    pixmap.destroy();
    loaded.destroy();
    return pixels;
  }
}

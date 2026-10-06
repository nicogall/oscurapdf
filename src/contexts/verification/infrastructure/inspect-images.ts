import type * as mupdf from 'mupdf';
import { boxesIntersect, type BoundingBox } from '@shared-kernel';
import type { PlannedArea } from '@shared-kernel/published';
import type { ImageSample } from '../domain/checks/image-pixel-check';

const TOLERANCE = 8;
const INSET_PIXELS = 2;
/**
 * JPEG images are re-encoded after redaction (to keep files small): compression ringing from the
 * surrounding, non-redacted pixels reaches a few pixels into the area, so the outer JPEG block
 * (8 px) is not compared. Everything inside must still be uniform.
 */
const JPEG_INSET_PIXELS = 8;

interface PixelRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Maps a page-space box into the image's pixel grid by inverting the image transform. */
export interface ImageGrid {
  readonly width: number;
  readonly height: number;
  /** Pixels at the edge of the area that are not compared. */
  readonly inset: number;
}

export const toImagePixels = (box: BoundingBox, m: mupdf.Matrix, { width, height, inset }: ImageGrid): PixelRect => {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  const toUnit = (x: number, y: number): [number, number] => [(d * (x - e) - c * (y - f)) / det, (a * (y - f) - b * (x - e)) / det];
  const corners = [toUnit(box.x, box.y), toUnit(box.x + box.width, box.y), toUnit(box.x, box.y + box.height), toUnit(box.x + box.width, box.y + box.height)];
  const us = corners.map(([u]) => u * width);
  const vs = corners.map(([, v]) => v * height);
  const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);
  return {
    x0: clamp(Math.ceil(Math.min(...us)) + inset, width),
    y0: clamp(Math.ceil(Math.min(...vs)) + inset, height),
    x1: clamp(Math.floor(Math.max(...us)) - inset, width),
    y1: clamp(Math.floor(Math.max(...vs)) - inset, height),
  };
};

const sameColour = (pixels: Uint8ClampedArray, at: number, reference: number, components: number): boolean => {
  for (let k = 0; k < components; k++) {
    if (Math.abs((pixels[at + k] ?? 0) - (pixels[reference + k] ?? 0)) > TOLERANCE) return false;
  }
  return true;
};

/** True when every pixel in the rect equals the first one within a small tolerance. */
export const isUniform = (pixmap: mupdf.Pixmap, rect: PixelRect): boolean => {
  const pixels = pixmap.getPixels();
  const stride = pixmap.getStride();
  const n = pixmap.getNumberOfComponents();
  const reference = rect.y0 * stride + rect.x0 * n;
  for (let y = rect.y0; y < rect.y1; y++) {
    for (let x = rect.x0; x < rect.x1; x++) {
      if (!sameColour(pixels, y * stride + x * n, reference, n)) return false;
    }
  }
  return true;
};

/** Pixel sizes of the page's JPEG images (structured text gives the image, not its encoding). */
const jpegSizes = (page: mupdf.PDFPage): Set<string> => {
  const sizes = new Set<string>();
  const entry = page.getObject().get('Resources').get('XObject');
  const xobjects = entry.isNull() ? undefined : entry.resolve();
  if (xobjects === undefined || !xobjects.isDictionary()) return sizes;
  xobjects.forEach((value) => {
    const image = value.resolve();
    if (image.get('Filter').toString().includes('DCTDecode')) sizes.add(`${String(image.get('Width').asNumber())}x${String(image.get('Height').asNumber())}`);
  });
  return sizes;
};

interface ImageUnderAreas {
  readonly image: mupdf.Image;
  readonly transform: mupdf.Matrix;
  readonly areas: readonly BoundingBox[];
  readonly lossy: boolean;
}

const sampleImage = ({ image, transform, areas, lossy }: ImageUnderAreas, page: number): ImageSample[] => {
  const pixmap = image.toPixmap();
  const grid = { width: pixmap.getWidth(), height: pixmap.getHeight(), inset: lossy ? JPEG_INSET_PIXELS : INSET_PIXELS };
  const samples = areas
    .map((area) => toImagePixels(area, transform, grid))
    .filter((rect) => rect.x1 > rect.x0 && rect.y1 > rect.y0)
    .map((rect) => ({ page, uniform: isUniform(pixmap, rect) }));
  pixmap.destroy();
  return samples;
};

/** For every image drawn under a redaction area: are its pixels there uniform (replaced)? */
export const inspectImages = (page: mupdf.PDFPage, pageIndex: number, areas: readonly PlannedArea[]): ImageSample[] => {
  const samples: ImageSample[] = [];
  const lossy = jpegSizes(page);
  const structured = page.toStructuredText('preserve-images');
  structured.walk({
    onImageBlock: (bbox, transform, image) => {
      const imageBox = { x: bbox[0], y: bbox[1], width: bbox[2] - bbox[0], height: bbox[3] - bbox[1] };
      const under = areas.map((a) => a.box).filter((box) => boxesIntersect(box, imageBox));
      const isJpeg = lossy.has(`${String(image.getWidth())}x${String(image.getHeight())}`);
      if (under.length > 0) samples.push(...sampleImage({ image, transform, areas: under, lossy: isJpeg }, pageIndex));
    },
  });
  structured.destroy();
  return samples;
};

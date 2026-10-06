import type * as mupdf from 'mupdf';
import type { BoundingBox } from '@shared-kernel';
import type { PageChar, PageLine, PageText } from '../domain/page-text';

/** Axis-aligned box of a MuPDF quad [ulx, uly, urx, ury, llx, lly, lrx, lry] (page space). */
export const quadToBox = (quad: mupdf.Quad): BoundingBox => {
  const xs = [quad[0], quad[2], quad[4], quad[6]];
  const ys = [quad[1], quad[3], quad[5], quad[7]];
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(Math.max(...xs) - x, 0.01), height: Math.max(Math.max(...ys) - y, 0.01) };
};

export interface PageExtraction {
  readonly text: PageText;
  readonly imageCount: number;
}

/** MuPDF's own onChar callback signature (external API: 7 positional arguments). */
type OnCharArgs = Parameters<NonNullable<Parameters<mupdf.StructuredText['walk']>[0]['onChar']>>;

/** Walks MuPDF structured text into per-character page text. */
export const extractPage = (page: mupdf.Page, pageIndex: number): PageExtraction => {
  const lines: PageLine[] = [];
  let current: PageChar[] = [];
  let imageCount = 0;
  const structured = page.toStructuredText('preserve-whitespace,preserve-images');
  structured.walk({
    beginLine: () => {
      current = [];
    },
    onChar: (...args: OnCharArgs) => {
      const [char, , , , quad] = args;
      current.push({ char, box: quadToBox(quad) });
    },
    endLine: () => {
      lines.push({ chars: current });
    },
    onImageBlock: () => {
      imageCount += 1;
    },
  });
  structured.destroy();
  return { text: { page: pageIndex, lines }, imageCount };
};

export const hasVisibleText = (text: PageText): boolean =>
  text.lines.some((line) => line.chars.some((c) => c.char.trim().length > 0));

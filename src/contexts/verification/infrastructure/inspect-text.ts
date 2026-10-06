import type * as mupdf from 'mupdf';
import type { GlyphBox } from '../domain/checks/geometry-check';

/** Axis-aligned box of a MuPDF quad (page space). */
const quadBox = (quad: mupdf.Quad) => {
  const xs = [quad[0], quad[2], quad[4], quad[6]];
  const ys = [quad[1], quad[3], quad[5], quad[7]];
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};

type OnCharArgs = Parameters<NonNullable<Parameters<mupdf.StructuredText['walk']>[0]['onChar']>>;

/** Page text (one line per structured-text line) and the box of every remaining glyph. */
export const inspectPageText = (page: mupdf.Page, pageIndex: number): { text: string; glyphs: GlyphBox[] } => {
  let text = '';
  const glyphs: GlyphBox[] = [];
  const structured = page.toStructuredText('preserve-whitespace');
  structured.walk({
    onChar: (...args: OnCharArgs) => {
      const [char, , , , quad] = args;
      text += char;
      if (char.trim().length > 0) glyphs.push({ page: pageIndex, box: quadBox(quad) });
    },
    endLine: () => {
      text += '\n';
    },
  });
  structured.destroy();
  return { text, glyphs };
};

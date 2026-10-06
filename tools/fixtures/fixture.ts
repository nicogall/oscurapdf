import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';

/** A generated test PDF plus its ground truth. All content is synthetic (constitution V). */
export interface Fixture {
  readonly fileName: string;
  readonly bytes: Uint8Array;
  readonly truth: Record<string, unknown>;
}

export const A4 = { width: 595, height: 842 } as const;
export const FONT_SIZE = 11;
export const LINE_GAP = 16;
export const MARGIN = 50;

/** Draws one line per entry, top to bottom, starting at the top margin. */
export const drawLines = (page: PDFPage, font: PDFFont, lines: readonly string[]): void => {
  lines.forEach((line, i) => {
    page.drawText(line, { x: MARGIN, y: page.getHeight() - MARGIN - i * LINE_GAP, size: FONT_SIZE, font });
  });
};

/** A plain text PDF: one page per entry of `pages`, Helvetica 11 pt. */
export const textPdf = async (pages: ReadonlyArray<readonly string[]>): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) drawLines(doc.addPage([A4.width, A4.height]), font, lines);
  return doc.save({ useObjectStreams: false });
};

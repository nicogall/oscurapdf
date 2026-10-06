import {
  PDFDocument,
  StandardFonts,
  beginText,
  endText,
  moveText,
  setFontAndSize,
  setTextRenderingMode,
  showText,
  TextRenderingMode,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { A4, FONT_SIZE, LINE_GAP, MARGIN, textPdf, type Fixture } from '../fixture';
import { rasterizePages, scannedJpegPages } from '../raster';

const LINES = ['Scanned letter for Mario Rossi', 'Via Roma 14, Milano'];

/**
 * scanned-with-ocr-layer.pdf: a page image showing the text, plus the same text as invisible
 * (render mode 3) text at the same positions — like OCR output. Redacting the text must also
 * destroy the image pixels (FR-022, clarification Q1).
 */
const scannedWithOcr = async (): Promise<Fixture> => {
  const [png] = rasterizePages(await textPdf([LINES]));
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4.width, A4.height]);
  if (png === undefined) throw new Error('rasterization failed');
  const image = await doc.embedPng(png);
  page.drawImage(image, { x: 0, y: 0, width: A4.width, height: A4.height });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontName = page.node.newFontDictionary('Ocr', font.ref);
  LINES.forEach((line, i) => {
    page.pushOperators(
      beginText(),
      setTextRenderingMode(TextRenderingMode.Invisible),
      setFontAndSize(fontName, FONT_SIZE),
      moveText(MARGIN, A4.height - MARGIN - i * LINE_GAP),
      showText(font.encodeText(line)),
      endText(),
    );
  });
  return {
    fileName: 'scanned-with-ocr-layer.pdf',
    bytes: await doc.save({ useObjectStreams: false }),
    truth: { name: 'Mario Rossi', lines: LINES },
  };
};

const JPEG_PAGES = [
  ['Verbale di consegna', 'Consegnato a Giulia Bianchi in data odierna.', 'Firma del ricevente: Giulia Bianchi'],
  ['Allegato A', 'Referente: Giulia Bianchi', 'Telefono interno 2041'],
  ['Allegato B', 'Note finali senza dati personali.', 'Pagina conclusiva'],
];

/** Invisible OCR text over a page image, at the same positions as the visible lines. */
const addOcrLayer = (page: PDFPage, font: PDFFont, lines: readonly string[]): void => {
  const fontName = page.node.newFontDictionary('Ocr', font.ref);
  lines.forEach((line, i) => {
    page.pushOperators(
      beginText(),
      setTextRenderingMode(TextRenderingMode.Invisible),
      setFontAndSize(fontName, FONT_SIZE),
      moveText(MARGIN, A4.height - MARGIN - i * LINE_GAP),
      showText(font.encodeText(line)),
      endText(),
    );
  });
};

/**
 * scanned-jpeg.pdf: three pages scanned to JPEG (with paper noise, like a real scanner) and an
 * OCR text layer. Redacting must not blow up the file size (images stay JPEG) and must verify.
 */
const scannedJpeg = async (): Promise<Fixture> => {
  const jpegs = scannedJpegPages(await textPdf(JPEG_PAGES));
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [i, jpeg] of jpegs.entries()) {
    const page = doc.addPage([A4.width, A4.height]);
    page.drawImage(await doc.embedJpg(jpeg), { x: 0, y: 0, width: A4.width, height: A4.height });
    addOcrLayer(page, font, JPEG_PAGES[i] ?? []);
  }
  return { fileName: 'scanned-jpeg.pdf', bytes: await doc.save({ useObjectStreams: false }), truth: { name: 'Giulia Bianchi', pages: 3 } };
};

export const generate = async (): Promise<Fixture[]> => [await scannedWithOcr(), await scannedJpeg()];

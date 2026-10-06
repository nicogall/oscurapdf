import {
  PDFDocument,
  PDFHexString,
  StandardFonts,
  beginText,
  degrees,
  endText,
  moveText,
  setFontAndSize,
  showText,
} from 'pdf-lib';
import { A4, FONT_SIZE, MARGIN, drawLines, type Fixture } from '../fixture';

/** 0xAE is the "fi" ligature glyph in StandardEncoding. "ﬁnal clause" = AE 6E 61 6C ... */
const LIGATURE_HEX = 'AE6E616C20636C61757365';

const addRunsPage = async (doc: PDFDocument): Promise<void> => {
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4.width, A4.height]);
  const y = A4.height - MARGIN;
  page.drawText('Signed by', { x: MARGIN, y, size: FONT_SIZE, font: regular });
  const boldX = MARGIN + regular.widthOfTextAtSize('Signed by ', FONT_SIZE);
  page.drawText('Mario Rossi', { x: boldX, y, size: FONT_SIZE, font: bold });
  const tailX = boldX + bold.widthOfTextAtSize('Mario Rossi ', FONT_SIZE);
  page.drawText('on behalf of ACME.', { x: tailX, y, size: FONT_SIZE, font: regular });
  addLigatureLine(doc, page, y - 40);
};

const addLigatureLine = (doc: PDFDocument, page: ReturnType<PDFDocument['addPage']>, y: number): void => {
  const fontDict = doc.context.obj({
    Type: 'Font',
    Subtype: 'Type1',
    BaseFont: 'Helvetica',
    Encoding: 'StandardEncoding',
  });
  const name = page.node.newFontDictionary('Lig', doc.context.register(fontDict));
  page.pushOperators(
    beginText(),
    setFontAndSize(name, FONT_SIZE),
    moveText(MARGIN, y),
    showText(PDFHexString.of(LIGATURE_HEX)),
    endText(),
  );
};

const addRotatedPage = async (doc: PDFDocument): Promise<void> => {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([A4.width, A4.height]);
  page.setRotation(degrees(90));
  drawLines(page, font, ['Rotated page for Mario Rossi.']);
};

/** multi-span.pdf: bold+regular runs, a ligature glyph, and a 90°-rotated page. */
const multiSpan = async (): Promise<Fixture> => {
  const doc = await PDFDocument.create();
  await addRunsPage(doc);
  await addRotatedPage(doc);
  return {
    fileName: 'multi-span.pdf',
    bytes: await doc.save({ useObjectStreams: false }),
    truth: {
      runsLine: 'Signed by Mario Rossi on behalf of ACME.',
      ligatureText: 'final clause',
      rotatedPage: 1,
      rotatedText: 'Rotated page for Mario Rossi.',
    },
  };
};

export const generate = async (): Promise<Fixture[]> => [await multiSpan()];

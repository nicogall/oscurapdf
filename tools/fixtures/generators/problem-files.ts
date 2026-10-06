import { PDFDict, PDFDocument, PDFName, StandardFonts } from 'pdf-lib';
import { A4, drawLines, textPdf, type Fixture } from '../fixture';
import { imagePdf, rasterizePages } from '../raster';

const MAX_BYTES = 52_428_800;

/** A valid PDF padded with trailing comment bytes to just over 50 MB (the size check comes first). */
const oversized = async (): Promise<Uint8Array> => {
  const base = await textPdf([['Oversized synthetic document.']]);
  const padded = new Uint8Array(MAX_BYTES + 1024 * 1024);
  padded.set(base);
  padded.fill(0x25, base.length);
  return padded;
};

/** Page 1 has text; page 2 is an image only (not checked automatically, but can be redacted by area). */
const partiallyScanned = async (): Promise<Uint8Array> => {
  const [png] = rasterizePages(await textPdf([['Scanned annex for Mario Rossi']]));
  if (png === undefined) throw new Error('rasterization failed');
  const { doc } = await imagePdf([png]);
  const merged = await PDFDocument.create();
  const font = await merged.embedFont(StandardFonts.Helvetica);
  drawLines(merged.addPage([A4.width, A4.height]), font, ['Cover letter with text.']);
  const [scanned] = await merged.copyPages(doc, [0]);
  if (scanned === undefined) throw new Error('copy failed');
  merged.addPage(scanned);
  return merged.save({ useObjectStreams: false });
};

/** Maps every printable code to a private-use character: what a broken character map extracts. */
const BROKEN_CMAP = `/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CMapName /Broken def
1 begincodespacerange <00> <FF> endcodespacerange
1 beginbfrange <20> <7E> <E020> endbfrange
endcmap CMapName currentdict /CMap defineresource pop end end`;

export const BROKEN_MAP_EMAIL = 'mario.esempio@example.it';

/**
 * FR-037: the e-mail line looks normal but its font has a broken character map, so the extracted
 * text is private-use characters. The other lines are readable.
 */
const brokenCharacterMap = async (): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const broken = await doc.embedFont(StandardFonts.Helvetica, { customName: 'BrokenMap' });
  const page = doc.addPage([A4.width, A4.height]);
  drawLines(page, font, ['Oggetto: contratto di locazione', '', 'Recapito del conduttore:']);
  page.drawText(BROKEN_MAP_EMAIL, { x: 50, y: A4.height - 50 - 3 * 16, size: 11, font: broken });
  await doc.flush(); // fonts are written to the document only now
  doc.context.lookup(broken.ref, PDFDict).set(PDFName.of('ToUnicode'), doc.context.register(doc.context.flateStream(BROKEN_CMAP)));
  return doc.save({ useObjectStreams: false });
};

/** US4 problem files (locked.pdf and scan-only.pdf come from the Phase 2 generator). */
export const generate = async (): Promise<Fixture[]> => [
  { fileName: 'not-a-pdf.txt', bytes: new TextEncoder().encode('This is a plain text file, not a PDF.'), truth: { rejected: 'notPdf' } },
  {
    fileName: 'corrupt.pdf',
    bytes: new TextEncoder().encode('%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> garbage without end'),
    truth: { rejected: 'invalid' },
  },
  { fileName: '51mb.pdf', bytes: await oversized(), truth: { rejected: 'tooLarge' } },
  { fileName: 'partially-scanned.pdf', bytes: await partiallyScanned(), truth: { pagesWithoutText: [1] } },
  { fileName: 'broken-character-map.pdf', bytes: await brokenCharacterMap(), truth: { unreadablePages: [0], email: BROKEN_MAP_EMAIL } },
];

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { A4, drawLines, type Fixture } from '../fixture';
import { rasterizePages } from '../raster';

/** Boxes in page space (points, origin top-left), as the app uses them. */
export const SIGNATURE_BOX = { x: 60, y: 300, width: 220, height: 70 } as const;
export const STAMP = { cx: 420, cy: 335, radius: 40 } as const;
export const OVERLAPPING_TEXT = 'Signed';

/** A scribble drawn as vector strokes, then rasterized so the letter embeds it as an image. */
const signaturePng = async (): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([SIGNATURE_BOX.width, SIGNATURE_BOX.height]);
  const path = Array.from({ length: 40 }, (_, i) => `${i === 0 ? 'M' : 'L'} ${10 + i * 5} ${35 + Math.sin(i / 2) * 20}`).join(' ');
  page.drawSvgPath(path, { x: 0, y: SIGNATURE_BOX.height, borderColor: rgb(0.05, 0.1, 0.5), borderWidth: 2.5 });
  const [png] = rasterizePages(await doc.save());
  if (png === undefined) throw new Error('rasterization failed');
  return png;
};

const toPdfY = (topY: number, height: number): number => A4.height - topY - height;

/** signed-letter.pdf: raster signature with text drawn over it, and a vector-drawn stamp (US3). */
const signedLetter = async (): Promise<Fixture> => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([A4.width, A4.height]);
  drawLines(page, font, ['Letter of engagement', 'Kind regards,']);
  const image = await doc.embedPng(await signaturePng());
  page.drawImage(image, { ...SIGNATURE_BOX, y: toPdfY(SIGNATURE_BOX.y, SIGNATURE_BOX.height) });
  page.drawText(OVERLAPPING_TEXT, { x: SIGNATURE_BOX.x + 10, y: toPdfY(SIGNATURE_BOX.y + 40, 11), size: 11, font });
  page.drawCircle({ x: STAMP.cx, y: A4.height - STAMP.cy, size: STAMP.radius, borderColor: rgb(0.7, 0, 0), borderWidth: 3 });
  page.drawLine({ start: { x: STAMP.cx - 30, y: A4.height - STAMP.cy }, end: { x: STAMP.cx + 30, y: A4.height - STAMP.cy }, color: rgb(0.7, 0, 0), thickness: 3 });
  return {
    fileName: 'signed-letter.pdf',
    bytes: await doc.save({ useObjectStreams: false }),
    truth: { signatureBox: SIGNATURE_BOX, stamp: STAMP, overlappingText: OVERLAPPING_TEXT },
  };
};

export const generate = async (): Promise<Fixture[]> => [await signedLetter()];

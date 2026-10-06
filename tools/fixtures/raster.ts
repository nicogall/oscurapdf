import * as mupdf from 'mupdf';
import { PDFDocument } from 'pdf-lib';

const SCAN_SCALE = 2;

/** Renders every page of a PDF to PNG, like a scanner would. */
export const rasterizePages = (bytes: Uint8Array): Uint8Array[] => {
  const source = mupdf.Document.openDocument(bytes, 'application/pdf');
  return Array.from({ length: source.countPages() }, (_, i) =>
    source
      .loadPage(i)
      .toPixmap(mupdf.Matrix.scale(SCAN_SCALE, SCAN_SCALE), mupdf.ColorSpace.DeviceRGB, false)
      .asPNG(),
  );
};

const JPEG_SCALE = 200 / 72;
const JPEG_QUALITY = 75;

/** Deterministic paper grain, so the scans compress like real ones (not like flat white). */
const addPaperNoise = (pixmap: mupdf.Pixmap): void => {
  const pixels = pixmap.getPixels();
  let seed = 7;
  for (let i = 0; i < pixels.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    pixels[i] = Math.max(0, (pixels[i] ?? 0) - 12 + (seed % 9));
  }
};

/** Renders every page at 200 dpi, adds paper grain and encodes it as JPEG, like a scanner. */
export const scannedJpegPages = (bytes: Uint8Array): Uint8Array[] => {
  const source = mupdf.Document.openDocument(bytes, 'application/pdf');
  return Array.from({ length: source.countPages() }, (_, i) => {
    const pixmap = source.loadPage(i).toPixmap(mupdf.Matrix.scale(JPEG_SCALE, JPEG_SCALE), mupdf.ColorSpace.DeviceRGB, false);
    addPaperNoise(pixmap);
    return pixmap.asJPEG(JPEG_QUALITY);
  });
};

/** Builds a PDF whose pages contain only the given PNG images (no text). */
export const imagePdf = async (pngs: readonly Uint8Array[]): Promise<{ doc: PDFDocument; bytes: Uint8Array }> => {
  const doc = await PDFDocument.create();
  for (const png of pngs) {
    const image = await doc.embedPng(png);
    const page = doc.addPage([image.width / SCAN_SCALE, image.height / SCAN_SCALE]);
    page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  return { doc, bytes: await doc.save({ useObjectStreams: false }) };
};

/** Encrypts a PDF with AES-256 so it cannot be opened without a password. */
export const encrypt = (bytes: Uint8Array): Uint8Array => {
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf') as mupdf.PDFDocument;
  const buffer = doc.saveToBuffer('encrypt=aes-256,user-password=synthetic-user,owner-password=synthetic-owner');
  // Copy out of WASM memory before the buffer is released.
  return new Uint8Array(buffer.asUint8Array());
};

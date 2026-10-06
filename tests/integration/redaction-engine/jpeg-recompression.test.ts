import { describe, expect, it } from 'vitest';
import * as mupdf from 'mupdf';
import { jpegImageSizes, recompressJpegImages, xobjectsOf } from '../../../src/contexts/redaction-engine/infrastructure/jpeg-recompression';

const greyJpeg = (width: number, height: number): Uint8Array => {
  const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, width, height], false);
  pixmap.clear(200);
  return pixmap.asJPEG(75);
};

/**
 * One page: a full-page JPEG scan (Scan), a small JPEG away from the redaction (Logo), a JPEG
 * with a soft mask (Masked) and a form XObject (Form).
 */
const page = (): { doc: mupdf.PDFDocument; page: mupdf.PDFPage } => {
  const doc = new mupdf.PDFDocument();
  const scan = doc.addImage(new mupdf.Image(greyJpeg(400, 560)));
  const logo = doc.addImage(new mupdf.Image(greyJpeg(40, 40)));
  const masked = doc.addImage(new mupdf.Image(greyJpeg(100, 100)));
  const mask = new mupdf.Pixmap(mupdf.ColorSpace.DeviceGray, [0, 0, 100, 100], false);
  mask.clear(128);
  masked.put('SMask', doc.addImage(new mupdf.Image(mask)));
  const form = doc.addStream('0 0 1 rg 0 0 10 10 re f', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 10, 10] });
  const resources = { XObject: { Scan: scan, Logo: logo, Masked: masked, Form: form } };
  const contents = 'q 595 0 0 842 0 0 cm /Scan Do Q q 40 0 0 40 540 780 cm /Logo Do Q q 100 0 0 100 0 0 cm /Masked Do Q /Form Do';
  doc.insertPage(-1, doc.addPage([0, 0, 595, 842], 0, resources, contents));
  return { doc, page: doc.loadPage(0) };
};

const filters = (target: mupdf.PDFPage): Record<string, string> => {
  const result: Record<string, string> = {};
  xobjectsOf(target)?.forEach((value, key) => {
    const object = value.resolve();
    if (object.get('Subtype').toString() === '/Image') result[String(key)] = object.get('Filter').toString();
  });
  return result;
};

describe('JPEG recompression after redaction', () => {
  it('re-encodes the redacted scan as JPEG, and leaves masked images, untouched images and forms alone', () => {
    const { doc, page: target } = page();
    const sizes = jpegImageSizes(target);
    expect([...sizes].sort()).toEqual(['100x100', '400x560', '40x40']);
    target.createAnnotation('Redact').setRect([100, 400, 300, 450]);
    target.createAnnotation('Redact').setRect([10, 750, 90, 830]);
    target.applyRedactions(true, mupdf.PDFPage.REDACT_IMAGE_PIXELS, 1, 0);
    const lossless = Object.values(filters(target)).filter((f) => !f.includes('DCTDecode')).length;
    expect(lossless).toBeGreaterThan(0);
    const recompressed = recompressJpegImages(doc, target, sizes);
    // The scan becomes JPEG again; the masked image keeps its (lossless) re-encoding and its mask.
    expect(recompressed).toBe(1);
    expect(Object.values(filters(target)).filter((f) => !f.includes('DCTDecode'))).toHaveLength(lossless - 1);
  });

  it('does nothing on a page without images, or with malformed resources', () => {
    const doc = new mupdf.PDFDocument();
    doc.insertPage(-1, doc.addPage([0, 0, 100, 100], 0, {}, ''));
    doc.insertPage(-1, doc.addPage([0, 0, 100, 100], 0, { XObject: [1, 2] }, ''));
    for (const index of [0, 1]) {
      const target = doc.loadPage(index);
      expect(jpegImageSizes(target).size).toBe(0);
      expect(recompressJpegImages(doc, target, new Set(['10x10']))).toBe(0);
    }
  });
});

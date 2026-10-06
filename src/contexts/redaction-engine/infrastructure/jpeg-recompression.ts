import * as mupdf from 'mupdf';

/**
 * Redacting image pixels makes MuPDF replace the image with a new, uncompressed one (saved with
 * lossless Flate), so a scanned JPEG page can grow tenfold. Images that were JPEG before redaction
 * are re-encoded as JPEG again; the redacted pixels are already black, so nothing removed can come
 * back. Images that were lossless (logos, signatures, line art) stay lossless.
 */
export const JPEG_QUALITY = 85;

/** The new image gets a new resource name, so a JPEG is recognised by its pixel size. */
type SizeKey = `${number}x${number}`;

/** The page's XObject dictionary (a missing entry is a null object, which cannot be resolved). */
export const xobjectsOf = (page: mupdf.PDFPage): mupdf.PDFObject | undefined => {
  const entry = page.getObject().get('Resources').get('XObject');
  if (entry.isNull()) return undefined;
  const xobjects = entry.resolve();
  return xobjects.isDictionary() ? xobjects : undefined;
};

const sizeOf = (image: mupdf.PDFObject): SizeKey => `${image.get('Width').asNumber()}x${image.get('Height').asNumber()}`;
const isImage = (image: mupdf.PDFObject): boolean => image.get('Subtype').toString() === '/Image';
const isJpeg = (image: mupdf.PDFObject): boolean => image.get('Filter').toString().includes('DCTDecode');

/** Pixel sizes of the page's JPEG images, taken before redaction. */
export const jpegImageSizes = (page: mupdf.PDFPage): Set<SizeKey> => {
  const sizes = new Set<SizeKey>();
  xobjectsOf(page)?.forEach((value) => {
    const image = value.resolve();
    if (isImage(image) && isJpeg(image)) sizes.add(sizeOf(image));
  });
  return sizes;
};

const toJpeg = (doc: mupdf.PDFDocument, reference: mupdf.PDFObject): mupdf.PDFObject | undefined => {
  const image = doc.loadImage(reference);
  if (image.getMask()) return undefined;
  const pixmap = image.toPixmap();
  const jpeg = pixmap.asJPEG(JPEG_QUALITY);
  pixmap.destroy();
  return doc.addImage(new mupdf.Image(jpeg));
};

/** After redaction: images that were JPEG and are no longer JPEG are re-encoded as JPEG. Returns how many. */
export const recompressJpegImages = (doc: mupdf.PDFDocument, page: mupdf.PDFPage, sizes: ReadonlySet<SizeKey>): number => {
  const xobjects = xobjectsOf(page);
  if (xobjects === undefined || sizes.size === 0) return 0;
  const replaced: Array<[string, mupdf.PDFObject]> = [];
  xobjects.forEach((value, key) => {
    const image = value.resolve();
    if (!isImage(image) || isJpeg(image) || !sizes.has(sizeOf(image))) return;
    const jpeg = toJpeg(doc, value);
    if (jpeg !== undefined) replaced.push([String(key), jpeg]);
  });
  for (const [key, jpeg] of replaced) xobjects.put(key, jpeg);
  return replaced.length;
};

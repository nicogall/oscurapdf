import { textPdf, type Fixture } from '../fixture';
import { encrypt, imagePdf, rasterizePages } from '../raster';

const SCANNED_LINES = ['Scanned letter for Mario Rossi', 'Via Roma 14, Milano'];

/** locked.pdf: password-protected (AES-256). */
const locked = async (): Promise<Fixture> => ({
  fileName: 'locked.pdf',
  bytes: encrypt(await textPdf([['Confidential synthetic document.']])),
  truth: { passwordProtected: true },
});

/** scan-only.pdf: pages are images only, no extractable text. */
const scanOnly = async (): Promise<Fixture> => {
  const pngs = rasterizePages(await textPdf([SCANNED_LINES, SCANNED_LINES]));
  return { fileName: 'scan-only.pdf', bytes: (await imagePdf(pngs)).bytes, truth: { imageOnly: true, pages: 2 } };
};

export const generate = async (): Promise<Fixture[]> => [await locked(), await scanOnly()];

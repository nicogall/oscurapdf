import { readFileSync } from 'node:fs';
import type { Download } from '@playwright/test';
import * as mupdf from 'mupdf';

export interface DownloadedPdf {
  readonly fileName: string;
  readonly text: string;
  readonly doc: mupdf.PDFDocument;
  readonly rawDecompressed: string;
}

/** Opens a downloaded PDF with MuPDF (in Node) for assertions. */
export const readDownload = async (download: Download): Promise<DownloadedPdf> => {
  const path = await download.path();
  const doc = mupdf.Document.openDocument(readFileSync(path), 'application/pdf') as mupdf.PDFDocument;
  let text = '';
  for (let i = 0; i < doc.countPages(); i++) text += doc.loadPage(i).toStructuredText('preserve-whitespace').asText();
  const rawDecompressed = new TextDecoder('latin1').decode(doc.saveToBuffer('decompress').asUint8Array());
  return { fileName: download.suggestedFilename(), text, doc, rawDecompressed };
};

import * as mupdf from 'mupdf';
import { err, ok, type PageIndex, type Result } from '@shared-kernel';
import type { PdfContents, PdfReader, ReaderError } from '../application/ports/pdf-reader';
import type { Page, PageRotation } from '../domain/page';
import type { PageText } from '../domain/page-text';
import type { MuPdfSession } from './mupdf-session';
import { extractPage, hasVisibleText } from './mupdf-text-mapper';

const normalizeRotation = (degrees: number): PageRotation => (((Math.round(degrees / 90) % 4) + 4) % 4) * 90 as PageRotation;

const rotationOf = (page: mupdf.PDFPage): PageRotation => {
  const rotate = page.getObject().getInheritable('Rotate');
  return normalizeRotation(rotate.isNumber() ? rotate.asNumber() : 0);
};

const readPage = (document: mupdf.PDFDocument, index: number): { page: Page; text: PageText } => {
  const pdfPage = document.loadPage(index);
  const [x0, y0, x1, y1] = pdfPage.getBounds();
  const { text, imageCount } = extractPage(pdfPage, index);
  const page: Page = {
    index: index as PageIndex,
    size: { width: x1 - x0, height: y1 - y0 },
    rotation: rotationOf(pdfPage),
    hasExtractableText: hasVisibleText(text),
    hasImages: imageCount > 0,
  };
  pdfPage.destroy();
  return { page, text };
};

const readAll = (document: mupdf.PDFDocument): PdfContents => {
  const pages = Array.from({ length: document.countPages() }, (_, i) => readPage(document, i));
  return { pages: pages.map((p) => p.page), text: pages.map((p) => p.text) };
};

/** PdfReader backed by MuPDF (document worker). */
export class MuPdfReader implements PdfReader {
  constructor(private readonly session: MuPdfSession) {}

  read(bytes: ArrayBuffer): Promise<Result<PdfContents, ReaderError>> {
    return Promise.resolve(this.readSync(bytes));
  }

  close(): Promise<void> {
    this.session.close();
    return Promise.resolve();
  }

  private readSync(bytes: ArrayBuffer): Result<PdfContents, ReaderError> {
    try {
      const document = this.session.open(bytes);
      if (document.needsPassword()) return err('passwordProtected');
      // A zero-page result is classified as invalid by the domain (classifyPages).
      return ok(readAll(document));
    } catch {
      this.session.close();
      return err('invalid');
    }
  }
}

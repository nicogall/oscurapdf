import * as mupdf from 'mupdf';

/** Holds the one open MuPDF document of the document worker, shared by reader and rasterizer. */
export class MuPdfSession {
  private document: mupdf.PDFDocument | undefined;

  open(bytes: ArrayBuffer): mupdf.PDFDocument {
    this.close();
    // With the 'application/pdf' magic MuPDF always uses its PDF handler, so this is a PDFDocument.
    const opened = mupdf.Document.openDocument(new Uint8Array(bytes), 'application/pdf') as mupdf.PDFDocument;
    this.document = opened;
    return opened;
  }

  current(): mupdf.PDFDocument | undefined {
    return this.document;
  }

  close(): void {
    this.document?.destroy();
    this.document = undefined;
  }
}

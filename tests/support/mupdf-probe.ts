import * as mupdf from 'mupdf';

/** Test-only helpers to inspect an output PDF independently of the code under test. */
export const openPdf = (bytes: Uint8Array | ArrayBuffer): mupdf.PDFDocument =>
  mupdf.Document.openDocument(new Uint8Array(bytes), 'application/pdf') as mupdf.PDFDocument;

export const allText = (doc: mupdf.PDFDocument): string => {
  let text = '';
  for (let i = 0; i < doc.countPages(); i++) {
    doc
      .loadPage(i)
      .toStructuredText('preserve-whitespace')
      .walk({
        onChar: (c: string) => {
          text += c;
        },
        endLine: () => {
          text += '\n';
        },
      });
  }
  return text;
};

/** Decodes every raw byte of the file as Latin-1: catches leftovers in any uncompressed object. */
export const rawBytesText = (bytes: Uint8Array): string => new TextDecoder('latin1').decode(bytes);

export const countOccurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

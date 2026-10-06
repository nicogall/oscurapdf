import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { err, ok, type Result } from '@shared-kernel';
import type { IndependentPdfParser, ParsedPdf } from '../application/ports/independent-pdf-parser';

interface TextItemLike {
  readonly str?: string;
  readonly hasEOL?: boolean;
}

const pageText = (items: readonly TextItemLike[]): string =>
  items.map((item) => `${item.str ?? ''}${item.hasEOL === true ? '\n' : ''}`).join('');

/** Independent parser (PDF.js): validity and full text extraction (research R5). */
export class PdfJsParser implements IndependentPdfParser {
  async parse(output: Uint8Array): Promise<Result<ParsedPdf, 'unparseable'>> {
    const task = getDocument({ data: output, disableFontFace: true, verbosity: VerbosityLevel.ERRORS });
    try {
      const doc = await task.promise;
      const pageTexts: string[] = [];
      for (let number = 1; number <= doc.numPages; number++) {
        const content = await (await doc.getPage(number)).getTextContent();
        pageTexts.push(pageText(content.items as TextItemLike[]));
      }
      return ok({ pageCount: doc.numPages, pageTexts });
    } catch {
      return err('unparseable');
    } finally {
      await task.destroy();
    }
  }
}

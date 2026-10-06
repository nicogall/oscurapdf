import type { Result } from '@shared-kernel';

export interface ParsedPdf {
  readonly pageCount: number;
  readonly pageTexts: readonly string[];
}

/** A PDF parser independent of the writer (PDF.js), so a writer bug cannot hide itself. */
export interface IndependentPdfParser {
  parse(output: Uint8Array): Promise<Result<ParsedPdf, 'unparseable'>>;
}

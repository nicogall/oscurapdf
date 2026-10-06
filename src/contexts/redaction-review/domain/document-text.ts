import type { CharRange, PageArea } from '@shared-kernel';

/**
 * What the review needs from the canonical document text. Defined here so the domain does not
 * import another context (the ingestion TextModel satisfies it structurally).
 */
export interface DocumentText {
  readonly text: string;
  occurrencesOf(needle: string): CharRange[];
  areasFor(range: CharRange): PageArea[];
}

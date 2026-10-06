import type { CharRange, PageArea } from '@shared-kernel';
import type { DocumentText } from './document-text';

/** One place a redaction applies: a text range (text redactions) and its on-page areas (≥ 1). */
export interface Occurrence {
  readonly range?: CharRange;
  readonly areas: readonly PageArea[];
}

export const textOccurrence = (doc: DocumentText, range: CharRange): Occurrence => ({ range, areas: doc.areasFor(range) });

const sameRange = (a: CharRange | undefined, b: CharRange | undefined): boolean =>
  a !== undefined && b !== undefined && a.start === b.start && a.end === b.end;

/** Union by range, ordered by position in the document. */
export const mergeOccurrences = (current: readonly Occurrence[], extra: readonly Occurrence[]): Occurrence[] => {
  const merged = [...current];
  for (const occurrence of extra) {
    if (!merged.some((o) => sameRange(o.range, occurrence.range))) merged.push(occurrence);
  }
  return merged.sort((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0));
};

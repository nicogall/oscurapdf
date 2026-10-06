import { findWholeWordOccurrences, normalizeText, type CharRange, type NormalizedText } from '@shared-kernel';

/**
 * FR-012a: occurrences are matched after the shared normalization, ignoring case, whole words
 * only. Returned ranges are in original-text offsets.
 */
export const findOccurrences = (normalizedDocument: NormalizedText, needle: string): CharRange[] => {
  const normalizedNeedle = normalizeText(needle).normalized.trim();
  return findWholeWordOccurrences(normalizedDocument.normalized, normalizedNeedle).map((range) =>
    normalizedDocument.offsets.toOriginal(range),
  );
};

import { findWholeWordOccurrences, normalizeText } from '@shared-kernel';
import type { FailureLocator } from '../failure-locator';
import { checkFrom, type VerificationCheck } from '../verification-check';

const pageFailures = (pageText: string, page: number, redactedTexts: readonly string[]): FailureLocator[] => {
  const normalized = normalizeText(pageText).normalized;
  return redactedTexts.flatMap((text, redactionIndex) =>
    findWholeWordOccurrences(normalized, text).length > 0 ? [{ page, redactionIndex }] : [],
  );
};

/**
 * No redacted text appears in any engine's extracted text. Same rule as occurrence matching
 * (shared normalization, case-insensitive, whole words).
 */
export const textAbsentCheck = (
  sources: ReadonlyArray<readonly string[]>,
  redactedTexts: readonly string[],
): VerificationCheck => {
  const failures = sources.flatMap((pages) => pages.flatMap((text, page) => pageFailures(text, page, redactedTexts)));
  const unique = [...new Map(failures.map((f) => [`${f.page}:${f.redactionIndex}`, f])).values()];
  return checkFrom('textAbsent', unique);
};

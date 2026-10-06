import { findWholeWordOccurrences, normalizeText, type CharRange } from '@shared-kernel';

export interface ScrubbedValue {
  readonly value: string;
  readonly removed: number;
}

const matchesIn = (value: string, redactedTexts: readonly string[]): CharRange[] => {
  const { normalized, offsets } = normalizeText(value);
  return redactedTexts.flatMap((text) =>
    findWholeWordOccurrences(normalized, text).map((range) => offsets.toOriginal(range)),
  );
};

/** Merges overlapping ranges so each character is deleted once. */
const mergeRanges = (ranges: readonly CharRange[]): CharRange[] => {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: CharRange[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last !== undefined && range.start <= last.end) merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, range.end) };
    else merged.push(range);
  }
  return merged;
};

/**
 * FR-021 / clarification Q2: deletes every redacted text (whole word, case-insensitive) from a
 * side-channel value; everything else is kept unchanged.
 */
export const scrubValue = (value: string, redactedTexts: readonly string[]): ScrubbedValue => {
  const merged = mergeRanges(matchesIn(value, redactedTexts));
  let scrubbed = value;
  for (const range of [...merged].reverse()) scrubbed = scrubbed.slice(0, range.start) + scrubbed.slice(range.end);
  return { value: scrubbed, removed: merged.length };
};

export const containsRedactedText = (value: string, redactedTexts: readonly string[]): boolean =>
  matchesIn(value, redactedTexts).length > 0;

/** An attachment is removed entirely if its name or text content contains redacted text. */
export const attachmentDecision = (name: string, content: string, redactedTexts: readonly string[]): 'keep' | 'remove' =>
  containsRedactedText(name, redactedTexts) || containsRedactedText(content, redactedTexts) ? 'remove' : 'keep';

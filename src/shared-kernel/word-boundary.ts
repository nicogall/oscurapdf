import type { CharRange } from './char-range';

/**
 * Whole-word matching on normalized text (FR-012a). A "word character" is a Unicode letter,
 * number or combining mark; anything else (space, apostrophe, hyphen, punctuation) is a boundary.
 */
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;

const isWordChar = (char: string | undefined): boolean => char !== undefined && WORD_CHAR.test(char);

export const isWholeWord = (text: string, range: CharRange): boolean => {
  const startsInsideWord = isWordChar(text[range.start]) && isWordChar(text[range.start - 1]);
  const endsInsideWord = isWordChar(text[range.end - 1]) && isWordChar(text[range.end]);
  return !startsInsideWord && !endsInsideWord;
};

/** All whole-word occurrences of `needle` in `text`. Both must already be normalized. */
export const findWholeWordOccurrences = (text: string, needle: string): CharRange[] => {
  if (needle.length === 0) return [];
  const found: CharRange[] = [];
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) {
    const range = { start: at, end: at + needle.length };
    if (isWholeWord(text, range)) found.push(range);
  }
  return found;
};

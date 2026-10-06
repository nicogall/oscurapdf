import { isValidCodiceFiscale } from '../checksums/codice-fiscale-check';
import type { Detector } from '../detector';
import { TAX_CODE_KEYWORDS, hasContextBefore } from './context-keywords';
import { candidateAt, type NormalizedMatch } from './pattern-match';

const LETTER = '[a-z]';
/** Digits, or the letters that replace them in omocodia codes. */
const DIGIT = '[0-9lmnpqrstuv]';
const MONTH = '[abcdehlmprst]';
const SHAPE = [...Array<string>(6).fill(LETTER), DIGIT, DIGIT, MONTH, DIGIT, DIGIT, LETTER, DIGIT, DIGIT, DIGIT, LETTER];

/**
 * 16 characters with an optional space between any two (the normalized text has single spaces):
 * "RSSMRA85T10A562S", "RSSMRA 85T10 A562S", or one character per box in a printed form.
 * A zero-width lookahead tries every word start, so a near miss that begins in the previous word
 * ("…le rss…") can never hide the real code that follows.
 */
const CODE_AT_WORD_START = new RegExp(`(?<![\\p{L}\\p{N}])(?=(${SHAPE.join(' ?')})(?![\\p{L}\\p{N}]))`, 'gu');

interface FoundCode extends NormalizedMatch {
  readonly valid: boolean;
}

/**
 * Codes in the normalized text, left to right, never overlapping. A wrong check character is
 * accepted only for a compact code (no spaces): spaced near misses are too easy to find by chance.
 */
const codesIn = (text: string): FoundCode[] => {
  const found: FoundCode[] = [];
  for (const m of text.matchAll(CODE_AT_WORD_START)) {
    const value = String(m[1]);
    const last = found.at(-1);
    const valid = isValidCodiceFiscale(value.replace(/ /g, ''));
    if ((last === undefined || m.index >= last.range.end) && (valid || !value.includes(' '))) {
      found.push({ range: { start: m.index, end: m.index + value.length }, value, valid });
    }
  }
  return found;
};

const KEYWORD_WINDOW = 24;

/**
 * Italian tax code. A valid check character is High. The right shape with a wrong check character
 * is still a tax code (clarification 2026-10-04): High after "codice fiscale" / "C.F.", otherwise
 * shown but not preselected.
 */
export const itTaxCodeDetector: Detector = {
  name: 'it-tax-code',
  detect: (input) =>
    codesIn(input.normalized.normalized).flatMap((m) => {
      const sure = m.valid || hasContextBefore(input.normalized.normalized, m.range.start, TAX_CODE_KEYWORDS, KEYWORD_WINDOW);
      return candidateAt(input, m.range, 'IT_TAX_CODE', sure ? 'high' : 'medium');
    }),
};

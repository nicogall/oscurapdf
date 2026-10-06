import { IBAN_LENGTHS, isValidIban } from '../checksums/mod97';
import type { ConfidenceLevel } from '@shared-kernel/published';
import type { Detector } from '../detector';
import { IBAN_KEYWORDS, hasContextBefore } from './context-keywords';
import { candidateAt, matchesOf } from './pattern-match';

const START = /(?<![\p{L}\p{N}])[a-z]{2}\d{2}/gu;
const ALNUM = /[a-z0-9]/;

/** End offset after collecting `count` alphanumerics, allowing single spaces between groups. */
const collectEnd = (text: string, start: number, count: number): number | undefined => {
  let collected = 0;
  let at = start;
  while (at < text.length && collected < count) {
    const char = text.charAt(at);
    if (ALNUM.test(char)) collected += 1;
    else if (char !== ' ' || !ALNUM.test(text.charAt(at + 1))) return undefined;
    at += 1;
  }
  return collected === count && !ALNUM.test(text.charAt(at)) ? at : undefined;
};

/** Italian account part: one check letter, ten digits (bank and branch), twelve characters. */
const ITALIAN_SHAPE = /^it\d{2}[a-z]\d{10}[a-z0-9]{12}$/;

const hasNationalShape = (iban: string): boolean => !iban.startsWith('it') || ITALIAN_SHAPE.test(iban);

/**
 * A valid check is High. A wrong check with the right shape and length is still an IBAN (a typo, or
 * a made-up one): High when the text calls it an IBAN, otherwise shown but not preselected
 * (clarification 2026-10-04).
 */
const confidenceOf = (text: string, start: number, iban: string): ConfidenceLevel | undefined => {
  if (isValidIban(iban)) return 'high';
  if (!hasNationalShape(iban)) return undefined;
  return hasContextBefore(text, start, IBAN_KEYWORDS) ? 'high' : 'medium';
};

export const ibanDetector: Detector = {
  name: 'iban',
  detect: (input) =>
    matchesOf(input, START).flatMap((m) => {
      const length = IBAN_LENGTHS[m.value.slice(0, 2).toUpperCase()];
      const text = input.normalized.normalized;
      const end = length === undefined ? undefined : collectEnd(text, m.range.start, length);
      if (end === undefined) return [];
      const confidence = confidenceOf(text, m.range.start, text.slice(m.range.start, end).replace(/ /g, ''));
      return confidence === undefined ? [] : candidateAt(input, { start: m.range.start, end }, 'IBAN', confidence);
    }),
};

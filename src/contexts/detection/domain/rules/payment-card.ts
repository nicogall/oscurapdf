import { luhnValid } from '../checksums/luhn';
import type { Detector, DetectionInput } from '../detector';
import { CARD_KEYWORDS, hasContextBefore } from './context-keywords';
import { candidateAt, matchesOf, type NormalizedMatch } from './pattern-match';

/** Never inside a longer code: digits glued to letters belong to an IBAN or another identifier. */
const CANDIDATE = /(?<![\p{L}\p{N}])\d(?:[ -]?\d){12,22}(?![\p{L}\p{N}])/gu;
const ISSUER = /^(?:4|5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]|720)|3[47]|3[068]|35|6011|65)/;

/** Longest prefix of 13–19 digits with a known issuer and a valid Luhn check. */
const validPrefixLength = (digits: string): number | undefined => {
  for (let length = Math.min(19, digits.length); length >= 13; length--) {
    const prefix = digits.slice(0, length);
    if (ISSUER.test(prefix) && luhnValid(prefix)) return length;
  }
  return undefined;
};

/** Offset (relative to the match) just after the n-th digit. */
const endAfterDigit = (value: string, n: number): number => {
  let seen = 0;
  for (let i = 0; i < value.length; i++) if (/\d/.test(value.charAt(i)) && ++seen === n) return i + 1;
  return value.length;
};

const KEYWORD_WINDOW = 30;
const isCardLength = (digits: string): boolean => digits.length >= 13 && digits.length <= 19;

/**
 * How many digits of the match are the card number: all of them when the text calls it a card
 * ("carta di credito 4139 …"), even if its check fails (clarification 2026-10-04); otherwise the
 * longest valid prefix.
 */
const cardLength = (input: DetectionInput, match: NormalizedMatch): number | undefined => {
  const digits = match.value.replace(/\D/g, '');
  const called = isCardLength(digits) && hasContextBefore(input.normalized.normalized, match.range.start, CARD_KEYWORDS, KEYWORD_WINDOW);
  return called ? digits.length : validPrefixLength(digits);
};

export const paymentCardDetector: Detector = {
  name: 'payment-card',
  detect: (input) =>
    matchesOf(input, CANDIDATE).flatMap((m) => {
      const length = cardLength(input, m);
      if (length === undefined) return [];
      return candidateAt(input, { start: m.range.start, end: m.range.start + endAfterDigit(m.value, length) }, 'PAYMENT_CARD', 'high');
    }),
};

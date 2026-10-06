import type { Detector } from '../detector';
import { candidateAt, matchesOf } from './pattern-match';

/**
 * A compact code of 8–16 digits (dashes allowed, no spaces) can identify a person or an account
 * even without a label: "20240317", "784512369", "2026-00451". Longer runs, or digits spread over
 * many spaces, are not suggested without context (clarification 2026-10-01): cards, IBANs, tax
 * codes and phones have their own validated rules, and a keyword ("codice cliente: …") is handled
 * by the contextual-id rule. Dates (slashes), amounts (decimal separators) and digits glued to
 * letters are excluded. Reported as an identifier, High.
 */
const COMPACT_NUMBER = /(?<![\p{L}\p{N}.,/])(?<!\d[ -])\d(?:-?\d){7,}(?![\p{L}\p{N}]|[.,/]\d|[ -]\d)/gu;
const MAX_DIGITS = 16;

const digits = (value: string): number => value.replace(/\D/g, '').length;

export const longNumberDetector: Detector = {
  name: 'long-number',
  detect: (input) =>
    matchesOf(input, COMPACT_NUMBER)
      .filter((m) => digits(m.value) <= MAX_DIGITS)
      .flatMap((m) => candidateAt(input, m.range, 'CONTEXTUAL_ID', 'high')),
};

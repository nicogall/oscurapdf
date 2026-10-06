import type { Detector } from '../detector';
import { PHONE_KEYWORDS, hasContextBefore } from './context-keywords';
import { candidateAt, matchesOf } from './pattern-match';

const SEP = '[ .-]?';
const INTERNATIONAL = new RegExp(`(?<![\\p{N}+])\\+\\d{1,3}${SEP}\\d{1,4}(?:${SEP}\\d{2,4}){1,4}(?![\\p{N}])`, 'gu');
const ITALIAN = new RegExp(`(?<![\\p{N}+/])(?:3\\d{2}${SEP}\\d{3}${SEP}\\d{3,4}|0\\d{1,3}(?:${SEP}\\d{2,8}){1,3})(?![\\p{N}/])`, 'gu');

const digitCount = (value: string): number => value.replace(/\D/g, '').length;
const plausible = (value: string): boolean => digitCount(value) >= 8 && digitCount(value) <= 15;

/**
 * Only numbers we are sure are phones: international format with "+", or an Italian number after
 * a keyword (Tel., Cell., …). Other long numbers are covered by the long-number rule anyway.
 */
export const phoneDetector: Detector = {
  name: 'phone',
  detect: (input) => {
    const international = matchesOf(input, INTERNATIONAL).filter((m) => plausible(m.value));
    const italian = matchesOf(input, ITALIAN).filter(
      (m) => plausible(m.value) && hasContextBefore(input.normalized.normalized, m.range.start, PHONE_KEYWORDS),
    );
    return [...international, ...italian]
      .sort((a, b) => a.range.start - b.range.start)
      .flatMap((m) => candidateAt(input, m.range, 'PHONE', 'high'));
  },
};

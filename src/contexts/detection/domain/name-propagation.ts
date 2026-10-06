import { rangesOverlap } from '@shared-kernel';
import { createDetectionCandidate, type DetectionCandidate } from '@shared-kernel/published';
import { isFormLabel } from './form-labels';

/** Name particles are not names on their own ("De Luca" → only "Luca" is propagated). */
const PARTICLES = new Set(['de', 'di', 'da', 'del', 'della', 'dei', 'degli', 'dal', 'van', 'von', 'der', 'den', 'la', 'lo', 'le', 'mc', 'mac', 'st']);
const PART = /\p{Lu}[\p{L}'’-]{2,}/gu;
/** A part proposed as a person in this many separate places is confirmed even if each was Medium. */
const REPEATED_EVIDENCE = 2;

const escape = (word: string): string => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wholeWord = (word: string, flags: string): RegExp => new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])`, flags);

const isPerson = (c: DetectionCandidate): boolean => c.category === 'PERSON';

/** Name parts of a candidate, lower-cased: "ROSSI MARIO" → rossi, mario. */
const partsOf = (text: string, c: DetectionCandidate): string[] =>
  [...text.slice(c.range.start, c.range.end).matchAll(PART)]
    .map((m) => m[0].toLowerCase())
    .filter((part) => !PARTICLES.has(part) && !isFormLabel(part));

/** A part also written in lower case in this document is a common word there ("Costa" / "costa"). */
const usedAsCommonWord = (text: string, part: string): boolean => [...text.matchAll(wholeWord(part, 'gu'))].length > 0;

/** Parts of names we are sure of: from a High name, or proposed as a person in several places. */
const confirmedParts = (text: string, candidates: readonly DetectionCandidate[]): Set<string> => {
  const seen = new Map<string, number>();
  const sure = new Set<string>();
  for (const c of candidates.filter(isPerson)) {
    for (const part of partsOf(text, c)) {
      seen.set(part, (seen.get(part) ?? 0) + 1);
      if (c.confidence === 'high' || (seen.get(part) ?? 0) >= REPEATED_EVIDENCE) sure.add(part);
    }
  }
  return new Set([...sure].filter((part) => !usedAsCommonWord(text, part)));
};

const upgrade = (text: string, c: DetectionCandidate, confirmed: Set<string>): DetectionCandidate =>
  isPerson(c) && c.confidence === 'medium' && partsOf(text, c).some((p) => confirmed.has(p)) ? { ...c, confidence: 'high' } : c;

/** First occurrence of `part` (any case) that no candidate already covers. */
const uncoveredOccurrence = (text: string, part: string, taken: readonly DetectionCandidate[]) =>
  [...text.matchAll(wholeWord(part, 'giu'))]
    .map((m) => ({ start: m.index, end: m.index + m[0].length }))
    .find((range) => !taken.some((c) => rangesOverlap(c.range, range)));

/**
 * Clarification 2026-10-01: a first name or surname we are sure of ("Mario Rossi", or "Rossi"
 * proposed in several places) is personal data wherever it appears ("Rossi", "ROSSI"): Medium
 * names containing it become High, and one candidate is added for a still-uncovered occurrence
 * (the review then covers every occurrence of the same text).
 */
export const propagateNameParts = (text: string, candidates: readonly DetectionCandidate[]): DetectionCandidate[] => {
  const confirmed = confirmedParts(text, candidates);
  const result = candidates.map((c) => upgrade(text, c, confirmed));
  for (const part of confirmed) {
    const range = uncoveredOccurrence(text, part, result);
    const candidate = range && createDetectionCandidate(text, { category: 'PERSON', range, confidence: 'high', method: 'ner' });
    if (candidate?.ok === true) result.push(candidate.value);
  }
  return result.sort((a, b) => a.range.start - b.range.start);
};

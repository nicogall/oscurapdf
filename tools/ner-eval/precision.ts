/** SC-006b scoring: precision of the suggestions on realistic documents with marked personal data. */
import type { ConfidenceLevel } from '../../src/shared-kernel/published';
import { isFound, type Span } from './metrics';

export interface ParsedDocument {
  readonly text: string;
  readonly pii: readonly Span[];
}

const OPEN = '⟦';
const CLOSE = '⟧';

/** Strips the ⟦…⟧ markers and returns the clean text with the marked spans. */
export const parseMarked = (marked: string): ParsedDocument => {
  const pii: Span[] = [];
  let text = '';
  for (const [i, part] of marked.split(new RegExp(`[${OPEN}${CLOSE}]`, 'u')).entries()) {
    if (i % 2 === 1) pii.push({ start: text.length, end: text.length + part.length });
    text += part;
  }
  return { text, pii };
};

export interface Suggestion extends Span {
  readonly confidence: ConfidenceLevel;
}

export interface PrecisionScore {
  /** Suggestions that overlap marked personal data / all suggestions, for preselected (High) and shown. */
  readonly preselected: { readonly correct: number; readonly total: number };
  readonly shown: { readonly correct: number; readonly total: number };
  /** Marked items fully covered by preselected suggestions. */
  readonly covered: { readonly found: number; readonly total: number };
  readonly falsePositives: readonly string[];
}

const overlaps = (a: Span, b: Span): boolean => a.start < b.end && b.start < a.end;

const RANK: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };
const escape = (word: string): string => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * What the user actually sees: like the review, each suggested text covers every whole-word,
 * case-insensitive occurrence, with the highest confidence any suggestion of that text had.
 */
export const expandOccurrences = (text: string, suggestions: readonly Suggestion[]): Suggestion[] => {
  const best = new Map<string, ConfidenceLevel>();
  for (const s of suggestions) {
    const key = text.slice(s.start, s.end).toLowerCase();
    const known = best.get(key);
    if (known === undefined || RANK[s.confidence] > RANK[known]) best.set(key, s.confidence);
  }
  return [...best].flatMap(([key, confidence]) =>
    [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escape(key)}(?![\\p{L}\\p{N}])`, 'giu'))].map((m) => ({ start: m.index, end: m.index + m[0].length, confidence })),
  );
};

export const scorePrecision = (doc: ParsedDocument, suggested: readonly Suggestion[]): PrecisionScore => {
  const suggestions = expandOccurrences(doc.text, suggested);
  const correct = (s: Span): boolean => doc.pii.some((p) => overlaps(p, s));
  const preselected = suggestions.filter((s) => s.confidence === 'high');
  const entity = (p: Span) => ({ ...p, category: 'PERSON' as const });
  return {
    preselected: { correct: preselected.filter(correct).length, total: preselected.length },
    shown: { correct: suggestions.filter(correct).length, total: suggestions.length },
    covered: { found: doc.pii.filter((p) => isFound(doc.text, entity(p), preselected)).length, total: doc.pii.length },
    falsePositives: suggestions.filter((s) => !correct(s)).map((s) => `${doc.text.slice(s.start, s.end)} (${s.confidence})`),
  };
};

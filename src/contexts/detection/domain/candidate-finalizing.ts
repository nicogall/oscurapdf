import type { DetectionCandidate } from '@shared-kernel/published';
import { mergeCandidates } from './candidate-merging';
import { propagateNameParts } from './name-propagation';

/** Precision first (clarification 2026-10-01): weak suggestions are never shown. */
const isConfident = (candidate: DetectionCandidate): boolean => candidate.confidence !== 'low';

/**
 * Every suggestion covers all occurrences of its text, so a one- or two-character suggestion ("1")
 * would black out that text everywhere. Never suggested automatically (a manual selection can).
 */
export const MIN_SUGGESTION_CHARS = 3;

const isLongEnough = (text: string, candidate: DetectionCandidate): boolean =>
  text.slice(candidate.range.start, candidate.range.end).replace(/\s/g, '').length >= MIN_SUGGESTION_CHARS;

/**
 * The document-wide last step of detection: drop Low and too-short, resolve overlaps, propagate confirmed name
 * parts. It needs the whole text, so with segmented detection it runs once at the end.
 */
export const finalizeCandidates = (text: string, candidates: readonly DetectionCandidate[]): DetectionCandidate[] =>
  propagateNameParts(text, mergeCandidates(candidates.filter((c) => isConfident(c) && isLongEnough(text, c))));

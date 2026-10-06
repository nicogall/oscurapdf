import type { CharRange } from '@shared-kernel';
import type { ConfidenceLevel, PiiCategory } from '@shared-kernel/published';
import { firstLine, wordsIn } from './span-words';

export interface GradedFinding {
  readonly range: CharRange;
  readonly confidence: ConfidenceLevel;
}

/**
 * Measured on independent Italian text (2026-10-06): a phone, email or card the model scores 0.90 or
 * more is right more than four times in five; act numbers, documents and streets scored 0.90–0.99
 * are right only a third to a half of the time, and need 0.99.
 */
const MIN_SCORE = 0.99;
const MIN_SCORE_BY_CATEGORY: Partial<Record<PiiCategory, number>> = { PHONE: 0.9, EMAIL: 0.9, PAYMENT_CARD: 0.9 };
/** "12", "Roma": a house number or a place on its own is not an address. */
const MIN_ADDRESS_WORDS = 2;

/**
 * Grading of what the model finds besides people and organizations (addresses, identifiers, plates).
 * The rules already give High to what they can check; the model reads context, which is never
 * certain evidence, so its findings are Medium: shown, not preselected.
 */
export const gradeModelFinding = (text: string, range: CharRange, score: number, category: PiiCategory): GradedFinding | undefined => {
  const words = wordsIn(text, firstLine(text, range));
  const first = words[0];
  const last = words.at(-1);
  if (first === undefined || last === undefined || score < (MIN_SCORE_BY_CATEGORY[category] ?? MIN_SCORE)) return undefined;
  if (category === 'LOCATION' && words.length < MIN_ADDRESS_WORDS) return undefined;
  return { range: { start: first.start, end: last.end }, confidence: 'medium' };
};

import type { CharRange } from '@shared-kernel';
import type { ConfidenceLevel } from '@shared-kernel/published';
import { isFormLabel } from './form-labels';
import { hasTitleBefore, isGreeting, isNeverAName, withAdjacentCapitals, withElidedParticle, withSurnameNextToFirstName } from './name-context';
import { firstLine, wordsIn, type Word } from './span-words';

export interface GradedPerson {
  readonly range: CharRange;
  readonly confidence: ConfidenceLevel;
}

const NAME_WORD = /^\p{Lu}[\p{L}'’-]+$/u;
const STRONG_SCORE = 0.9;
const MIN_SCORE = 0.85;
/** Two or more capitalised words are already some evidence: weaker scores are still shown. */
const MULTI_WORD_MIN_SCORE = 0.5;
/** After a title ("avv. Ferrari") the context already says it is a person. */
const TITLED_MIN_SCORE = 0.4;

/** Form labels, greetings, and lower-case fragments of a title the tokenizer split ("dott.ssa" → "ssa"). */
const notAName = (word: Word): boolean => isFormLabel(word.text) || isGreeting(word.text) || !/^\p{Lu}/u.test(word.text);

/** Drops non-name words at both edges ("Nome Mario" → "Mario", "Gentile Rossi" → "Rossi"). */
const trimEdges = (words: readonly Word[]): Word[] => {
  let from = 0;
  let to = words.length;
  while (from < to && notAName(words[from] as Word)) from += 1;
  while (to > from && notAName(words[to - 1] as Word)) to -= 1;
  return words.slice(from, to);
};

interface Evidence {
  readonly words: number;
  readonly score: number;
  readonly agreeingModels: number;
  readonly titled: boolean;
}

const grade = ({ words, score, agreeingModels, titled }: Evidence): ConfidenceLevel | undefined => {
  if (titled && score >= TITLED_MIN_SCORE) return 'high';
  if (words < 2) return score >= MIN_SCORE ? 'medium' : undefined;
  if (score >= STRONG_SCORE || (agreeingModels >= 2 && score >= MIN_SCORE)) return 'high';
  return score >= MULTI_WORD_MIN_SCORE ? 'medium' : undefined;
};

const isPlausibleName = (words: readonly Word[]): boolean =>
  words.length > 0 && words.every((w) => NAME_WORD.test(w.text) && !notAName(w) && !isNeverAName(w.text));

/**
 * Precision-first grading of a model's PERSON span (clarifications 2026-10-01): only whole
 * capitalised words, never form labels, greetings or company names. High: first + last name with a
 * strong score, or any name right after a title ("sig. Rossi"). Medium (shown, not preselected): a
 * single name without a title, or a full name with a weaker score. Anything weaker is dropped.
 * Name propagation may later raise Medium names confirmed elsewhere in the document.
 */
export const gradePerson = (text: string, range: CharRange, score: number, agreeingModels: number): GradedPerson | undefined => {
  const line = firstLine(text, { start: withElidedParticle(text, range.start), end: range.end });
  // A confident single first name takes its surname along ("Fittizio Marilena").
  const named = score >= STRONG_SCORE ? withSurnameNextToFirstName(text, line) : line;
  const widened = withAdjacentCapitals(text, named);
  const words = trimEdges(wordsIn(text, widened));
  const first = words[0];
  const last = words.at(-1);
  if (first === undefined || last === undefined || !isPlausibleName(words)) return undefined;
  const confidence = grade({ words: words.length, score, agreeingModels, titled: hasTitleBefore(text, first.start) });
  return confidence === undefined ? undefined : { range: { start: first.start, end: last.end }, confidence };
};

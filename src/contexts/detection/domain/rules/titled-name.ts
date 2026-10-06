import type { Detector } from '../detector';
import { isFormLabel } from '../form-labels';
import { isGreeting, isLegalForm, isTitle, titlesIn } from '../name-context';
import { originalCandidate } from './original-text-match';

/** Up to three capitalised words (with an elided particle: "D'Angelo") on the same line. */
const NAMES = /[ \t]+((?:\p{Lu}['’])?\p{Lu}[\p{L}'’-]+(?:[ \t]+(?:\p{Lu}['’])?\p{Lu}[\p{L}'’-]+){0,2})/uy;

/** A second title is not a name either ("Sig. Avv. Rossi": the name follows the last title). */
const isNameWord = (word: string): boolean => !isFormLabel(word) && !isGreeting(word) && !isLegalForm(word) && !isTitle(word);

/** The name right after a title, cut before the first word that cannot be part of a name. */
const nameAfter = (text: string, from: number): { start: number; end: number } | undefined => {
  NAMES.lastIndex = from;
  const match = NAMES.exec(text);
  const found = match?.[1];
  if (match === null || found === undefined) return undefined;
  const words = found.split(/[ \t]+/u);
  const stop = words.findIndex((w) => !isNameWord(w));
  const name = (stop === -1 ? words : words.slice(0, stop)).join(' ');
  const start = match.index + match[0].length - found.length;
  return name.length < 2 ? undefined : { start, end: start + name.length };
};

/**
 * A courtesy or professional title followed by capitalised words is a person (High), whatever the
 * NER model says: "sig. Rossi", "dott.ssa Greco", "avv. Ferrari", "Mr Smith" (clarification 2026-10-01).
 */
export const titledNameDetector: Detector = {
  name: 'titled-name',
  detect: (input) =>
    titlesIn(input.text).flatMap((after) => {
      const name = nameAfter(input.text, after);
      return name === undefined ? [] : originalCandidate(input, name, 'PERSON', 'high');
    }),
};

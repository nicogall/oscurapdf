import type { Detector } from '../detector';
import { ITALIAN_FIRST_NAMES } from '../italian-first-names';
import { closesPhrase, isNeverAName, startsSentence } from '../name-context';
import { originalCandidate } from './original-text-match';

interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** Capitalised words, in title case or capitals ("Rosaria", "INVENTATO", "D'Angelo"). */
const WORD = /(?:\p{Lu}['’])?\p{Lu}[\p{L}'’-]+/gu;
/** Surname particles taken along: "Lo Fittizio Gaetano", "De Luca Anna". */
const PARTICLE = /^(?:de|di|da|del|della|dello|dei|lo|la|li|le)$/iu;
/** A pair right after these is a place or an institution: "Piazza Giuseppe Garibaldi", "Santa Maria Novella". */
const PLACE_WORDS = new Set([
  'via', 'viale', 'piazza', 'piazzale', 'piazzetta', 'corso', 'largo', 'vicolo', 'vico', 'contrada', 'località', 'frazione', 'lungomare',
  'lungotevere', 'traversa', 'salita', 'borgo', 'strada', 'galleria', 'calle', 'san', 'santa', 'santo', "sant'", 'ponte', 'porta', 'monte',
  'villa', 'palazzo', 'castel', 'castello', 'torre', 'isola', 'lago', 'valle', 'capo', 'colle', 'parco', 'stazione',
]);

const adjacent = (text: string, left: Word, right: Word): boolean => /^[ \t]+$/u.test(text.slice(left.end, right.start));
const isFirstName = (word: Word): boolean => ITALIAN_FIRST_NAMES.has(word.text.toLowerCase());
const canBeSurname = (word: Word | undefined): word is Word => word !== undefined && word.text.length >= 3 && !isNeverAName(word.text) && !PLACE_WORDS.has(word.text.toLowerCase());

/** The surname next to the first name at `i`: before it ("Rossi Mario"), unless that only starts a sentence; else after it. */
const partnerOf = (text: string, words: readonly Word[], i: number): { first: number; last: number } | undefined => {
  const name = words[i] as Word;
  const before = words[i - 1];
  if (canBeSurname(before) && adjacent(text, before, name) && (!startsSentence(text, before.start) || closesPhrase(text, name.end))) return { first: i - 1, last: i };
  const after = words[i + 1];
  return canBeSurname(after) && adjacent(text, name, after) ? { first: i, last: i + 1 } : undefined;
};

/** Takes a surname particle along, and rejects pairs that name a place or an institution. */
const widen = (text: string, words: readonly Word[], pair: { first: number; last: number }): { start: number; end: number } | undefined => {
  const previous = words[pair.first - 1];
  const head = words[pair.first] as Word;
  const tail = words[pair.last] as Word;
  if (previous === undefined || !adjacent(text, previous, head)) return { start: head.start, end: tail.end };
  if (PLACE_WORDS.has(previous.text.toLowerCase()) || isNeverAName(previous.text)) return undefined;
  return PARTICLE.test(previous.text) ? { start: previous.start, end: tail.end } : { start: head.start, end: tail.end };
};

/**
 * Rare surnames are unknown to the model, but Italian first names are a known, limited set: a
 * capitalised word right next to a common first name is a surname ("Inventato Rosaria",
 * "Fittizio Marilena", "Calogero Esempio"). High (clarification 2026-10-01).
 */
export const firstNamePairDetector: Detector = {
  name: 'first-name-pair',
  detect: (input) => {
    const words: Word[] = [...input.text.matchAll(WORD)].map((m) => ({ text: m[0], start: m.index, end: m.index + m[0].length }));
    return words.flatMap((word, i) => {
      if (!isFirstName(word)) return [];
      const pair = partnerOf(input.text, words, i);
      const range = pair && widen(input.text, words, pair);
      return range ? originalCandidate(input, range, 'PERSON', 'high') : [];
    });
  },
};

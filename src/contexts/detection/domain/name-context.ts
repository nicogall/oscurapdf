/** Words around a candidate name that tell us whether it really is a person (IT + EN). */
import { isFormLabel } from './form-labels';

/** Courtesy and professional titles: "sig. Rossi", "dott.ssa Greco", "avv. Ferrari", "Mr Smith". */
const TITLE =
  '(?:sig(?:\\.ra|\\.na|nora|nor|ra\\.?|\\.)?|sigg\\.?|dott(?:\\.ssa|oressa|ore|or|ssa\\.?|\\.)|dr\\.?|avv(?:ocato|ocata|\\.)?|ing\\.|per\\.(?:ind\\.)?|prof(?:\\.ssa|essoressa|essore|essor|\\.)?|geom\\.|rag\\.|arch\\.|notaio|mr\\.?|mrs\\.?|ms\\.?|mister|madam)';

const TITLE_BEFORE = new RegExp(`(?<![\\p{L}])${TITLE}\\s*$`, 'iu');

const TITLE_ALONE = new RegExp(`^${TITLE}$`, 'iu');

/** "Avv", "Dott", "Ing": a title on its own, with or without its full stop. */
export const isTitle = (word: string): boolean => TITLE_ALONE.test(word) || TITLE_ALONE.test(`${word}.`);

/** Every title in a text, with the position right after it (for the titled-name rule). */
export const titlesIn = (text: string): number[] =>
  [...text.matchAll(new RegExp(`(?<![\\p{L}])${TITLE}(?=\\s)`, 'giu'))].map((m) => m.index + m[0].length);

/** Greetings and openings: "Gentile", "Egregio", "Dear" are never part of a name. */
const GREETINGS = new Set([
  'gentile', 'gentilissimo', 'gentilissima', 'egregio', 'egregia', 'caro', 'cara', 'carissimo', 'carissima', 'spettabile', 'dear', 'hello', 'hi',
  'ciao', 'buongiorno', 'buonasera', 'salve', 'grazie', 'auguri', 'complimenti', 'bravo', 'brava', 'thanks',
]);

/** Company legal forms: a "name" containing one is an organization. */
const LEGAL_FORMS = new Set(['srl', 's.r.l.', 'srls', 'spa', 's.p.a.', 'sas', 's.a.s.', 'snc', 's.n.c.', 'onlus', 'ltd', 'ltd.', 'llc', 'inc', 'inc.', 'plc', 'gmbh', 'ag', 'sa', 'corp', 'corp.']);

/** Head words of organizations and offices: "Ufficio Tecnico", "Comune di Bari", "Banca Alpina". */
const ORGANIZATION_WORDS = new Set([
  'ufficio', 'comune', 'società', 'societa', 'azienda', 'studio', 'banca', 'ditta', 'ente', 'istituto', 'ospedale', 'università', 'universita',
  'associazione', 'fondazione', 'cooperativa', 'agenzia', 'ministero', 'regione', 'provincia', 'servizio', 'servizi', 'reparto', 'direzione',
  'settore', 'gruppo', 'consorzio', 'scuola', 'tribunale', 'camera', 'liceo', 'teatro', 'stadio', 'aeroporto', 'chiesa', 'basilica', 'museo', 'premio',
  'parrocchia', 'clinica', 'company', 'office', 'department', 'bank', 'group', 'university', 'school', 'hospital',
]);

export const isOrganizationWord = (word: string): boolean => ORGANIZATION_WORDS.has(word.toLowerCase());

/** A word that can never be part of a person's name. */
export const isNeverAName = (word: string): boolean => isFormLabel(word) || isGreeting(word) || isLegalForm(word) || isOrganizationWord(word) || isTitle(word);

/** Elided particle glued to the name: "D'Angelo", "Dell'Orto". */
const ELIDED_BEFORE = /(?<![\p{L}])(?:d|dell|dall|degl|l)['’]$/iu;

export const hasTitleBefore = (text: string, start: number): boolean => TITLE_BEFORE.test(text.slice(Math.max(0, start - 20), start));

export const isGreeting = (word: string): boolean => GREETINGS.has(word.toLowerCase());

export const isLegalForm = (word: string): boolean => LEGAL_FORMS.has(word.toLowerCase().replace(/[,;:]$/u, ''));

const CAPS_WORD = /^(?:\p{Lu}['’])?\p{Lu}{2,}$/u;
const MAX_NAME_WORDS = 3;

const capsNeighbour = (text: string, from: number, direction: -1 | 1): { start: number; end: number } | undefined => {
  const pattern = direction === 1 ? /^[ \t]((?:\p{Lu}['’])?\p{Lu}{2,})(?![\p{L}])/u : /(?<![\p{L}'’])((?:\p{Lu}['’])?\p{Lu}{2,})[ \t]$/u;
  const match = direction === 1 ? pattern.exec(text.slice(from, from + 40)) : pattern.exec(text.slice(Math.max(0, from - 40), from));
  const word = match?.[1];
  if (match === null || word === undefined || isFormLabel(word) || isGreeting(word) || isLegalForm(word)) return undefined;
  const start = direction === 1 ? from + 1 : from - word.length - 1;
  return { start, end: start + word.length };
};

/**
 * In forms written in capitals the model often marks only the first name ("ROSSI MARIO" → "MARIO").
 * A name in capitals grows over the capitalised words right next to it, up to three words.
 */
export const withAdjacentCapitals = (text: string, range: { start: number; end: number }): { start: number; end: number } => {
  const words = text.slice(range.start, range.end).split(/\s+/u);
  if (!words.every((w) => CAPS_WORD.test(w))) return range;
  let { start, end } = range;
  let count = words.length;
  for (const direction of [-1, 1] as const) {
    let next = capsNeighbour(text, direction === 1 ? end : start, direction);
    while (next !== undefined && count < MAX_NAME_WORDS) {
      count += 1;
      if (direction === 1) end = next.end;
      else start = next.start;
      next = capsNeighbour(text, direction === 1 ? end : start, direction);
    }
  }
  return { start, end };
};

const NAME_LIKE = /^\p{Lu}\p{Ll}[\p{L}'’-]+$/u;
export const isNameLike = (word: string): boolean => NAME_LIKE.test(word) && !isFormLabel(word) && !isGreeting(word) && !isLegalForm(word);

/** The word right before `start` is the first of its sentence (line start, or after . ! ? :). */
export const startsSentence = (text: string, wordStart: number): boolean => /(?:^|[\n\f.!?:;])[ \t]*$/u.test(text.slice(Math.max(0, wordStart - 40), wordStart));

/** The name closes its phrase: end of line, or a comma, dash, semicolon or parenthesis follows. */
export const closesPhrase = (text: string, end: number): boolean => /^[ \t]*(?:$|[\n\f,;(–-])/u.test(text.slice(end, end + 3));

/**
 * Italian lists and forms put the surname first, and the model often marks only the first name
 * ("Fittizio Marilena" → "Marilena"). A single name grows over the capitalised word next to it: the
 * one before, unless that word only starts a sentence ("Oggi Marilena è…"); otherwise the one after.
 */
export const withSurnameNextToFirstName = (text: string, range: { start: number; end: number }): { start: number; end: number } => {
  const word = text.slice(range.start, range.end);
  if (!NAME_LIKE.test(word)) return range;
  const before = /(?<![\p{L}'’])(\p{Lu}[\p{L}'’-]+)[ \t]$/u.exec(text.slice(Math.max(0, range.start - 40), range.start))?.[1];
  if (before !== undefined && isNameLike(before)) {
    const start = range.start - before.length - 1;
    if (!startsSentence(text, start) || closesPhrase(text, range.end)) return { start, end: range.end };
  }
  const after = /^[ \t](\p{Lu}[\p{L}'’-]+)(?![\p{L}])/u.exec(text.slice(range.end, range.end + 40))?.[1];
  return after !== undefined && isNameLike(after) ? { start: range.start, end: range.end + 1 + after.length } : range;
};

/** Start of the name including an elided particle ("'Angelo" → "D'Angelo", "Angelo" after "D'"). */
export const withElidedParticle = (text: string, start: number): number => {
  let from = start;
  if (/['’]/u.test(text.charAt(from))) {
    while (from > 0 && /\p{L}/u.test(text.charAt(from - 1))) from -= 1;
    return from;
  }
  const match = ELIDED_BEFORE.exec(text.slice(Math.max(0, start - 6), start));
  return match === null ? start : start - match[0].length;
};

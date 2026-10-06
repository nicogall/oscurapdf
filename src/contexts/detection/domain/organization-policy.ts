import type { CharRange } from '@shared-kernel';
import type { ConfidenceLevel } from '@shared-kernel/published';
import { isFormLabel } from './form-labels';
import { isGreeting, isLegalForm, isOrganizationWord, isTitle } from './name-context';
import { firstLine, wordsIn, type Word } from './span-words';

export interface GradedOrganization {
  readonly range: CharRange;
  readonly confidence: ConfidenceLevel;
}

/** A single word needs a confident model; two or more capitalised words are already some evidence. */
const SINGLE_WORD_MIN_SCORE = 0.85;
const MULTI_WORD_MIN_SCORE = 0.5;

const startsLikeAName = (word: Word): boolean => /^[\p{Lu}\d]/u.test(word.text);

/** Form labels, greetings and lower-case words are never the edge of a name ("Spettabile Acme" → "Acme"). */
const notAnEdge = (word: Word): boolean => isFormLabel(word.text) || isGreeting(word.text) || !startsLikeAName(word);

const trimEdges = (words: readonly Word[]): Word[] => {
  let from = 0;
  let to = words.length;
  while (from < to && notAnEdge(words[from] as Word)) from += 1;
  while (to > from && notAnEdge(words[to - 1] as Word)) to -= 1;
  return words.slice(from, to);
};

/** Bodies every organization has: "Consiglio di Amministrazione", "Assemblea Condominiale". */
const GENERIC_BODIES = new Set([
  'consiglio', 'amministrazione', 'assemblea', 'condominiale', 'collegio', 'sindacale', 'comitato', 'commissione', 'direzione', 'generale', 'segreteria',
  'presidenza', 'board', 'committee', 'management',
]);
/** Acronyms and form values the model takes for organizations. */
const NOT_ORGANIZATIONS = new Set([
  'iban', 'bic', 'swift', 'p.iva', 'piva', 'c.f', 'cf', 'partita', 'codice', 'ccnl', 'iva', 'pec', 'cap', 'pdf', 'iso', 'uni', 'tfr', 'irpef', 'isee', 'spid', 'pin', 'pod', 'pdr', 'gdpr', 'vat',
  'eur', 'euro', 'usd', 'gbp', 'chf', 'm&a', 'per',
  'celibe', 'nubile', 'coniugato', 'coniugata', 'repubblica', 'norma', 'decreto', 'legge', 'regolamento', 'direttiva',
]);

const isGenericWord = (word: Word): boolean => {
  const bare = word.text.toLowerCase().replace(/[.,;:]+$/u, '');
  return isOrganizationWord(bare) || isLegalForm(word.text) || isTitle(word.text) || GENERIC_BODIES.has(bare) || NOT_ORGANIZATIONS.has(bare);
};

/** "Banca", "S.r.l.", "Consiglio di Amministrazione" name no one in particular. */
const isGeneric = (words: readonly Word[]): boolean => words.filter(startsLikeAName).every(isGenericWord);

/** A line written entirely in capitals is a heading or a form: capitals there say nothing ("REPUBBLICA ITALIANA"). */
const isInCapitalsLine = (text: string, range: CharRange): boolean => {
  const lineStart = text.lastIndexOf('\n', range.start) + 1;
  const lineEnd = text.indexOf('\n', range.end);
  return !/\p{Ll}/u.test(text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd));
};

/**
 * Grading of a model's ORGANIZATION span. The model alone is never certain evidence, so its
 * organizations are Medium: shown, not preselected. Deterministic evidence (a legal form, an
 * institution's head word) comes from the organization rule, which is High.
 */
export const gradeOrganization = (text: string, range: CharRange, score: number): GradedOrganization | undefined => {
  const words = trimEdges(wordsIn(text, firstLine(text, range)));
  const first = words[0];
  const last = words.at(-1);
  if (first === undefined || last === undefined || isGeneric(words)) return undefined;
  const found = { start: first.start, end: last.end };
  if (isInCapitalsLine(text, found)) return undefined;
  if (score < (words.length > 1 ? MULTI_WORD_MIN_SCORE : SINGLE_WORD_MIN_SCORE)) return undefined;
  return { range: found, confidence: 'medium' };
};

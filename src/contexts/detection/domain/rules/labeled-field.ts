import type { PiiCategory } from '@shared-kernel/published';
import type { Detector, DetectionInput } from '../detector';
import { isFormLabel } from '../form-labels';
import { isNeverAName, isTitle } from '../name-context';
import { originalCandidate } from './original-text-match';

const NAME_LABELS = [
  'nome e cognome', 'cognome e nome', 'nominativo', 'cognome', 'nome', 'il sottoscritto', 'la sottoscritta', 'intestatario', 'intestataria', 'titolare',
  'full name', 'surname', 'name',
  // Roles that introduce a person in Italian forms, registers and deeds (2026-10-01).
  'docente', 'relatore', 'relatrice', 'dipendente', 'paziente', 'cliente', 'utente', 'richiedente', 'dichiarante', 'beneficiario', 'beneficiaria',
  'delegato', 'delegata', 'firmatario', 'firmataria', 'referente', 'contraente', 'assicurato', 'assicurata', 'proprietario', 'proprietaria',
  'locatore', 'locatrice', 'conduttore', 'conduttrice', 'testimone', 'tutore', 'legale rappresentante', 'coniuge', 'acquirente', 'venditore', 'venditrice',
];
const PLACE_LABELS = ['luogo e data di nascita', 'luogo di nascita', 'comune di nascita', 'comune di residenza', 'nato a', 'nata a', 'nato/a a', 'residente a', 'residente in', 'place of birth', 'born in'];

const escape = (label: string): string => label.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const labelPattern = (labels: readonly string[]): RegExp =>
  new RegExp(`(?<![\\p{L}])(?:${labels.map(escape).join('|')})(?![\\p{L}])\\s*[:\\-]?\\s*`, 'gu');

/** One or two spaces between the words of a value: a wider gap starts the next column of a form. */
const VALUE = /(?:\p{Lu}[\p{L}'’-]*)(?:[ \t]{1,2}\p{Lu}[\p{L}'’-]*){0,2}/uy;
/** A place can have small links between its words: "Barcellona Pozzo di Gotto", "Reggio nell'Emilia". */
const PLACE_VALUE = /(?:\p{Lu}[\p{L}'’-]*)(?:[ \t]{1,2}(?:(?:di|del|della|sul|in|nell['’])[ \t]?)?\p{Lu}[\p{L}'’-]*){0,3}/uy;

/**
 * The words of a matched value that belong to it: cut before the next label word, and none at all
 * when the value is a title ("Il richiedente Avv. Rossi": the titled-name rule takes the name) or,
 * for a person, when it contains a company form or an office ("Contraente: ALFA SRL").
 */
const valueWords = (matched: string, category: PiiCategory): RegExpExecArray[] => {
  const words = [...matched.matchAll(/[^ \t]+/gu)];
  const stop = words.findIndex((word) => isFormLabel(word[0]));
  const kept = stop === -1 ? words : words.slice(0, stop);
  const isPersonLike = category !== 'PERSON' || !kept.some((word) => isNeverAName(word[0]));
  return isTitle(words[0]?.[0] ?? '') || !isPersonLike ? [] : kept;
};

/** The capitalised value right after `from` in the original text, cut before the next label word. */
const valueAt = (text: string, from: number, category: PiiCategory): { start: number; end: number } | undefined => {
  const pattern = category === 'LOCATION' ? PLACE_VALUE : VALUE;
  pattern.lastIndex = from;
  const match = pattern.exec(text);
  const last = match === null ? undefined : valueWords(match[0], category).at(-1);
  const length = last === undefined ? 0 : last.index + last[0].length;
  return length < 2 ? undefined : { start: from, end: from + length };
};

/** Original-text offset right after a normalized position (end of the text included). */
const originalAt = (input: DetectionInput, index: number): number =>
  index === input.normalized.normalized.length ? input.text.length : input.normalized.offsets.toOriginal({ start: index, end: index + 1 }).start;

const fieldsFor = (input: DetectionInput, labels: readonly string[], category: PiiCategory) =>
  [...input.normalized.normalized.matchAll(labelPattern(labels))].flatMap((m) => {
    const labelEnd = originalAt(input, m.index + m[0].trimEnd().replace(/[:-]$/u, '').trimEnd().length);
    const from = originalAt(input, m.index + m[0].length);
    // A label at the end of a line has no value: never take it from the next line.
    if (input.text.slice(labelEnd, from).includes('\n')) return [];
    const value = valueAt(input.text, from, category);
    return value === undefined ? [] : originalCandidate(input, value, category, 'high');
  });

/** Form fields: "Cognome ROSSI", "Nome: Mario", "Il sottoscritto …", "nato a Palermo" (High). */
export const labeledFieldDetector: Detector = {
  name: 'labeled-field',
  detect: (input) => [...fieldsFor(input, NAME_LABELS, 'PERSON'), ...fieldsFor(input, PLACE_LABELS, 'LOCATION')].sort((a, b) => a.range.start - b.range.start),
};

import { newEntityId, type CharRange } from '@shared-kernel';
import { compareConfidence, type ConfidenceLevel, type PiiCategory } from '@shared-kernel/published';
import type { DocumentText } from './document-text';
import { mergeOccurrences, textOccurrence, type Occurrence } from './occurrence';
import type { Redaction } from './redaction';
import { redactionKey } from './redaction-key';
import { initialSelection } from './selection-policy';

export interface TextSelection {
  readonly range: CharRange;
  readonly text: string;
  readonly key: string;
}

/** Shrinks a range to exclude surrounding whitespace; undefined if nothing but whitespace. */
export const trimSelection = (doc: DocumentText, range: CharRange): TextSelection | undefined => {
  const raw = doc.text.slice(range.start, range.end);
  const text = raw.trim();
  if (text.length === 0) return undefined;
  const start = range.start + raw.indexOf(text);
  return { range: { start, end: start + text.length }, text, key: redactionKey(text) };
};

/** FR-012a: every whole-word, case-insensitive occurrence, plus the selection exactly as made. */
export const collectOccurrences = (doc: DocumentText, selection: TextSelection): Occurrence[] =>
  mergeOccurrences(
    doc.occurrencesOf(selection.text).map((range) => textOccurrence(doc, range)),
    [textOccurrence(doc, selection.range)],
  );

export const newManualText = (doc: DocumentText, selection: TextSelection): Redaction => ({
  id: newEntityId<'Redaction'>(),
  kind: 'text',
  text: selection.text,
  key: selection.key,
  occurrences: collectOccurrences(doc, selection),
  category: 'MANUAL',
  source: 'manual',
  confidence: 'userConfirmed',
  selected: true,
});

export const newAutomaticText = (
  doc: DocumentText,
  selection: TextSelection,
  detection: { category: PiiCategory; confidence: ConfidenceLevel },
): Redaction => ({
  id: newEntityId<'Redaction'>(),
  kind: 'text',
  text: selection.text,
  key: selection.key,
  occurrences: collectOccurrences(doc, selection),
  category: detection.category,
  source: 'automatic',
  confidence: detection.confidence,
  selected: initialSelection('automatic', detection.confidence),
});

/** A manual addition upgrades the redaction to manual / userConfirmed / selected. */
export const upgradeToManual = (doc: DocumentText, current: Redaction, selection: TextSelection): Redaction => ({
  ...current,
  occurrences: mergeOccurrences(current.occurrences, collectOccurrences(doc, selection)),
  source: 'manual',
  confidence: 'userConfirmed',
  selected: true,
});

/** A repeated automatic finding never downgrades; it only raises an automatic confidence. */
export const mergeAutomatic = (current: Redaction, confidence: ConfidenceLevel): Redaction => {
  if (current.source === 'manual' || current.confidence === 'userConfirmed') return current;
  if (compareConfidence(confidence, current.confidence) <= 0) return current;
  return { ...current, confidence, selected: current.selected || initialSelection('automatic', confidence) };
};

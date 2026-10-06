import type { PiiCategory } from '@shared-kernel/published';
import type { CharRange } from '@shared-kernel';
import type { LabeledSpan } from './bio-aggregation';

/** What an on-device model can report: any category of the app. */
export type NerCategory = PiiCategory;

export type LabelMap = Readonly<Record<string, NerCategory>>;

/**
 * oscurapdf/pii-it-distilbert: the multilingual DistilBERT fine-tuned on 22 Italian PII labels
 * (research R4, 2026-10-04). Not mapped, so dropped here:
 * - CITY, PROVINCE, ZIPCODE, DATE, TIME, AMOUNT, AGE, GENDER: the app does not suggest them on their own (FR-007);
 * - CF, PIVA, IBAN, TARGA: the rules check their format, and on independent text most of the model's
 *   own findings for them were wrong (measured 2026-10-06: 17%, 33%, 76% and 0% right at score ≥ 0.99).
 */
export const PII_LABELS: LabelMap = {
  FULLNAME: 'PERSON',
  ORG: 'ORGANIZATION',
  STREET: 'LOCATION',
  BUILDINGNUM: 'LOCATION',
  EMAIL: 'EMAIL',
  TELEPHONENUM: 'PHONE',
  CREDITCARDNUMBER: 'PAYMENT_CARD',
  ID_DOC: 'ID_DOCUMENT',
  DOCID: 'CONTEXTUAL_ID',
  CATASTO: 'CONTEXTUAL_ID',
};

export interface ModelEntity {
  readonly range: CharRange;
  readonly category: NerCategory;
  readonly score: number;
}

export const mapLabels = (spans: readonly LabeledSpan[], labels: LabelMap): ModelEntity[] =>
  spans.flatMap((span) => {
    const category = labels[span.type];
    return category === undefined ? [] : [{ range: span.range, category, score: span.score }];
  });

/** Joins same-category entities separated only by spaces on the same line (e.g. GIVENNAME + SURNAME). */
export const joinAdjacent = (entities: readonly ModelEntity[], text: string): ModelEntity[] => {
  const joined: ModelEntity[] = [];
  for (const entity of [...entities].sort((a, b) => a.range.start - b.range.start)) {
    const last = joined.at(-1);
    const gap = last === undefined ? '' : text.slice(last.range.end, entity.range.start);
    if (last !== undefined && last.category === entity.category && /^[ \t]{0,2}$/.test(gap)) {
      joined[joined.length - 1] = { category: last.category, range: { start: last.range.start, end: entity.range.end }, score: Math.min(last.score, entity.score) };
    } else joined.push(entity);
  }
  return joined;
};

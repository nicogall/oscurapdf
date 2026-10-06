/** SC-006a/SC-006b scoring. An entity counts as found if detection proposes it at any confidence. */
export type EvalCategory = 'PERSON' | 'LOCATION' | 'ORGANIZATION';

export interface LabelledEntity {
  readonly start: number;
  readonly end: number;
  readonly category: EvalCategory;
}

export interface Span {
  readonly start: number;
  readonly end: number;
}

/** Found when every non-space character of the entity is covered by some proposed redaction. */
export const isFound = (text: string, entity: LabelledEntity, proposed: readonly Span[]): boolean => {
  for (let i = entity.start; i < entity.end; i++) {
    if (/\s/.test(text.charAt(i))) continue;
    if (!proposed.some((p) => p.start <= i && i < p.end)) return false;
  }
  return true;
};

export interface Recall {
  readonly found: number;
  readonly total: number;
}

export const recallRate = ({ found, total }: Recall): number => (total === 0 ? 1 : found / total);

export type Tier = 'target' | 'acceptedMinimum' | 'fail';

export const PRECISION_TARGET = 0.95;

/**
 * Clarification 2026-10-01 (precision first): preselected suggestions must be ≥ 95% correct, or the
 * run fails. PERSON recall: target ≥ 95%, accepted minimum ≥ 85%.
 */
export const tierOf = (personRecall: number, preselectedPrecision: number): Tier => {
  if (preselectedPrecision < PRECISION_TARGET || personRecall < 0.85) return 'fail';
  return personRecall >= 0.95 ? 'target' : 'acceptedMinimum';
};

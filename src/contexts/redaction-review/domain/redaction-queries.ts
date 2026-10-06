import type { Redaction, RedactionId } from './redaction';

export interface ReviewSummary {
  readonly total: number;
  readonly automatic: number;
  readonly manual: number;
  readonly selected: number;
}

export const findRedaction = (items: readonly Redaction[], id: RedactionId): Redaction | undefined =>
  items.find((r) => r.id === id);

/** FR-017 summary counts. */
export const summarize = (items: readonly Redaction[]): ReviewSummary => ({
  total: items.length,
  automatic: items.filter((r) => r.source === 'automatic').length,
  manual: items.filter((r) => r.source === 'manual').length,
  selected: items.filter((r) => r.selected).length,
});

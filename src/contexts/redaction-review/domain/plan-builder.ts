import { err, ok, type PageIndex, type Result } from '@shared-kernel';
import type { PlannedArea, RedactionPlan } from '@shared-kernel/published';
import type { Redaction } from './redaction';

const plannedAreas = (redaction: Redaction): Array<[PageIndex, PlannedArea]> =>
  redaction.occurrences.flatMap((occurrence) =>
    occurrence.areas.map((area): [PageIndex, PlannedArea] => [area.page, { box: area.box, origin: redaction.kind }]),
  );

const groupByPage = (entries: ReadonlyArray<[PageIndex, PlannedArea]>): Map<PageIndex, PlannedArea[]> => {
  const byPage = new Map<PageIndex, PlannedArea[]>();
  for (const [page, area] of entries) byPage.set(page, [...(byPage.get(page) ?? []), area]);
  return byPage;
};

/** Builds the engine's input from the selected redactions (published language). */
export const buildPlan = (items: readonly Redaction[]): Result<RedactionPlan, 'nothingSelected'> => {
  const selected = items.filter((r) => r.selected);
  if (selected.length === 0) return err('nothingSelected');
  const redactedTexts = [...new Set(selected.flatMap((r) => (r.key === undefined ? [] : [r.key])))];
  return ok({ areasByPage: groupByPage(selected.flatMap(plannedAreas)), redactedTexts });
};

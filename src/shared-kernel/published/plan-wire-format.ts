import type { PageIndex } from '../geometry/page-index';
import type { PlannedArea } from './planned-area';
import type { RedactionPlan } from './redaction-plan';

/** Structured-clone-friendly plan for worker messages (Maps become entry arrays). */
export interface WirePlan {
  readonly areasByPage: ReadonlyArray<readonly [number, readonly PlannedArea[]]>;
  readonly redactedTexts: readonly string[];
}

export const toWirePlan = (plan: RedactionPlan): WirePlan => ({
  areasByPage: [...plan.areasByPage.entries()],
  redactedTexts: plan.redactedTexts,
});

export const fromWirePlan = (wire: WirePlan): RedactionPlan => ({
  areasByPage: new Map(wire.areasByPage.map(([page, areas]) => [page as PageIndex, areas])),
  redactedTexts: wire.redactedTexts,
});

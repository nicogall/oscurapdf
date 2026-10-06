// Test build only (`vite build --mode e2e-fault`): injects a writer bug so e2e tests can exercise
// the verification-failure path (quickstart scenario 8). Never part of production builds.
import { ok, type PageIndex } from '@shared-kernel';
import type { PlannedArea, RedactionPlan } from '@shared-kernel/published';
import type { RedactionWriter } from '@engine';
import type { AppServices } from './app-services';
import { createAppServices as createServices } from './composition-root';

const countAreas = (plan: RedactionPlan): number => [...plan.areasByPage.values()].reduce((n, areas) => n + areas.length, 0);

const withoutFirstArea = (plan: RedactionPlan): RedactionPlan => {
  const [first, ...rest] = [...plan.areasByPage.entries()];
  if (first === undefined) return plan;
  const reduced: Array<[PageIndex, readonly PlannedArea[]]> = [[first[0], first[1].slice(1)], ...rest];
  return { ...plan, areasByPage: new Map(reduced) };
};

/** A buggy writer: skips one area but claims to have applied them all. Only verification can tell. */
const skipFirstArea = (writer: RedactionWriter): RedactionWriter => ({
  write: async (plan, progress) => {
    const result = await writer.write(withoutFirstArea(plan), progress);
    return result.ok ? ok({ ...result.value, areasApplied: countAreas(plan) }) : result;
  },
});

export const createAppServices = (): AppServices => createServices({ decorateWriter: skipFirstArea });

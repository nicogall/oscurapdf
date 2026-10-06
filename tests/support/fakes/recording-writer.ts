import { err, ok, type Result } from '@shared-kernel';
import type { RedactionPlan } from '@shared-kernel/published';
import type { ExportError, ExportResult, RedactionWriter } from '@engine';

/** RedactionWriter test double: records plans; applies every planned area unless told otherwise. */
export class RecordingWriter implements RedactionWriter {
  readonly plans: RedactionPlan[] = [];

  constructor(private readonly behaviour: 'applyAll' | 'skipOne' | ExportError = 'applyAll') {}

  write(plan: RedactionPlan): Promise<Result<ExportResult, ExportError>> {
    this.plans.push(plan);
    if (this.behaviour !== 'applyAll' && this.behaviour !== 'skipOne') return Promise.resolve(err(this.behaviour));
    const planned = [...plan.areasByPage.values()].reduce((n, areas) => n + areas.length, 0);
    const areasApplied = this.behaviour === 'skipOne' ? planned - 1 : planned;
    return Promise.resolve(ok({ output: new Uint8Array([37, 80, 68, 70]), areasApplied, sideChannelRemovals: [] }));
  }
}

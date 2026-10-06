import { err, type Result } from '@shared-kernel';
import type { RedactionPlan } from '@shared-kernel/published';
import type { ExportResult } from '../domain/export-result';
import type { ExportError, ProgressSink, RedactionWriter } from './ports/redaction-writer';

const plannedAreaCount = (plan: RedactionPlan): number =>
  [...plan.areasByPage.values()].reduce((count, areas) => count + areas.length, 0);

/** Writes the redacted PDF. Fails unless the writer applied every planned area. */
export class ExportRedactedPdf {
  constructor(private readonly writer: RedactionWriter) {}

  async execute(plan: RedactionPlan, progress?: ProgressSink): Promise<Result<ExportResult, ExportError>> {
    const planned = plannedAreaCount(plan);
    if (planned === 0) return err('emptyPlan');
    const result = await this.writer.write(plan, progress);
    if (result.ok && result.value.areasApplied !== planned) return err('writeFailed');
    return result;
  }
}

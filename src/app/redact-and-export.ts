import { err, ok, type Result } from '@shared-kernel';
import type { ExportError, ExportRedactedPdf, ProgressSink } from '@engine';
import type { RedactionReview } from '@review';
import type { VerificationReport, Verifier } from '@verification';
import type { Logger } from './ports/logger';
import { decideSave, type SaveDecision } from './save-decision';

export interface ExportOutcome {
  readonly report: VerificationReport;
  readonly output: Uint8Array;
  readonly decision: SaveDecision;
}

export type RedactAndExportError = 'nothingSelected' | ExportError;

export interface RedactAndExportDeps {
  readonly exporter: ExportRedactedPdf;
  readonly verifier: Verifier;
  readonly logger: Logger;
}

/** Review.toPlan → Engine → Verification → SaveDecision. The review is read-only meanwhile. */
export class RedactAndExport {
  constructor(private readonly deps: RedactAndExportDeps) {}

  async execute(review: RedactionReview, inputPageCount: number, progress?: ProgressSink): Promise<Result<ExportOutcome, RedactAndExportError>> {
    const plan = review.toPlan();
    if (!plan.ok) return err('nothingSelected');
    review.setMode('exporting');
    try {
      const exported = await this.deps.exporter.execute(plan.value, progress);
      if (!exported.ok) return err(exported.error);
      const itemsRemoved = review.store.snapshot().summary.selected;
      const report = await this.deps.verifier.execute({ output: exported.value.output, plan: plan.value, inputPageCount, itemsRemoved });
      this.deps.logger.log({ code: report.outcome === 'verified' ? 'verificationCompleted' : 'verificationFailed', count: itemsRemoved });
      return ok({ report, output: exported.value.output, decision: decideSave(report) });
    } finally {
      review.setMode('editing');
    }
  }
}

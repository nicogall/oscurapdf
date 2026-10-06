import type { Result } from '@shared-kernel';
import type { RedactionPlan } from '@shared-kernel/published';
import type { ExportResult } from '../../domain/export-result';

export type ExportError = 'noDocument' | 'writeFailed' | 'cancelled' | 'emptyPlan';

export type ProgressSink = (stage: string, fraction: number) => void;

/** Applies a plan to the open document and writes a new PDF (full rewrite). */
export interface RedactionWriter {
  write(plan: RedactionPlan, progress?: ProgressSink): Promise<Result<ExportResult, ExportError>>;
}

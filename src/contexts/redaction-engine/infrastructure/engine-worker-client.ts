import { err, ok, type Result } from '@shared-kernel';
import { toWirePlan, type RedactionPlan } from '@shared-kernel/published';
import type { RequestChannel } from '@workers/protocol';
import type { ExportError, ProgressSink, RedactionWriter } from '../application/ports/redaction-writer';
import type { ExportResult } from '../domain/export-result';

const KNOWN_ERRORS: readonly ExportError[] = ['noDocument', 'cancelled', 'emptyPlan', 'writeFailed'];

const toExportError = (code: string): ExportError =>
  KNOWN_ERRORS.includes(code as ExportError) ? (code as ExportError) : 'writeFailed';

/** Main-thread RedactionWriter: the document worker holds the original bytes and writes. */
export class EngineWorkerClient implements RedactionWriter {
  constructor(private readonly client: RequestChannel) {}

  async write(plan: RedactionPlan, progress?: ProgressSink): Promise<Result<ExportResult, ExportError>> {
    const options = progress ? { onProgress: progress } : {};
    const result = await this.client.request<ExportResult>('export', toWirePlan(plan), options);
    return result.ok ? ok(result.value) : err(toExportError(result.error.code));
  }
}

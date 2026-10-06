import type { PiiDetector } from '@detection';
import type { LoadedDocument } from '@ingestion';
import { RedactionReview } from '@review';
import { DetectionRun } from './detection-run';
import { ExportFlow } from './export-flow';
import type { FileSink } from './ports/file-sink';
import type { Logger } from './ports/logger';
import type { RedactAndExport } from './redact-and-export';

/** Per-document state: the review (redaction set), background detection and the export flow. */
export interface DocumentWorkspace {
  readonly review: RedactionReview;
  readonly detection: DetectionRun;
  readonly exportFlow: ExportFlow;
}

export interface WorkspaceDeps {
  readonly redactAndExport: RedactAndExport;
  readonly fileSink: FileSink;
  readonly detector: PiiDetector;
  readonly logger: Logger;
}

export type WorkspaceFactory = (loaded: LoadedDocument) => DocumentWorkspace;

/** Creates the workspace and starts detection in the background (the user can review meanwhile). */
export const workspaceFactory =
  ({ redactAndExport, fileSink, detector, logger }: WorkspaceDeps): WorkspaceFactory =>
  (loaded) => {
    const review = new RedactionReview(loaded.textModel);
    const detection = new DetectionRun(detector, review, logger);
    const exportFlow = new ExportFlow({
      redactAndExport,
      fileSink,
      review,
      inputPageCount: loaded.document.pages.length,
      fileName: loaded.document.fileName,
    });
    void detection.start(loaded.textModel.text);
    return { review, detection, exportFlow };
  };

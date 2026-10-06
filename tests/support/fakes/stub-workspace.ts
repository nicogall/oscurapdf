import { vi } from 'vitest';
import { ExportRedactedPdf } from '@engine';
import { workspaceFactory, type WorkspaceFactory } from '@app/document-workspace';
import { RedactAndExport } from '@app/redact-and-export';
import type { VerificationReport } from '@verification';
import type { PiiDetector } from '@detection';
import { RecordingWriter } from './recording-writer';

/** Real workspace (review + export flow) over a recording writer and a scripted verifier. */
const noDetection: PiiDetector = { execute: () => Promise.resolve({ candidates: [], degraded: false }) };

export const stubWorkspaceFactory = (outcome: 'verified' | 'failed' = 'verified', detector: PiiDetector = noDetection): WorkspaceFactory => {
  const report: VerificationReport = {
    itemsRemoved: 1,
    checks: [{ kind: 'textAbsent', passed: outcome === 'verified', failures: outcome === 'verified' ? [] : [{ page: 0 }] }],
    outcome,
  };
  const redactAndExport = new RedactAndExport({
    exporter: new ExportRedactedPdf(new RecordingWriter()),
    verifier: { execute: () => Promise.resolve(report) },
    logger: { log: vi.fn() },
  });
  return workspaceFactory({ redactAndExport, fileSink: { save: vi.fn() }, detector, logger: { log: vi.fn() } });
};

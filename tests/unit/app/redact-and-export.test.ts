import { describe, expect, it, vi } from 'vitest';
import { ExportRedactedPdf } from '@engine';
import { RedactionReview } from '@review';
import type { VerificationReport, Verifier } from '@verification';
import { ExportFlow } from '@app/export-flow';
import { RedactAndExport } from '@app/redact-and-export';
import { confirmUnverifiedSave, decideSave } from '@app/save-decision';
import { RecordingWriter } from '../../support/fakes/recording-writer';
import { rangeOf, reviewDocument } from '../../support/fakes/document-text';

const report = (outcome: 'verified' | 'failed'): VerificationReport => ({
  itemsRemoved: 1,
  checks: [{ kind: 'textAbsent', passed: outcome === 'verified', failures: outcome === 'verified' ? [] : [{ page: 0 }] }],
  outcome,
});

const setup = (outcome: 'verified' | 'failed' = 'verified', writer = new RecordingWriter()) => {
  const doc = reviewDocument();
  const review = new RedactionReview(doc);
  review.addManualText(rangeOf(doc, 'John Smith'));
  const execute = vi.fn(() => Promise.resolve(report(outcome)));
  const verifier: Verifier = { execute };
  const logger = { log: vi.fn() };
  const redactAndExport = new RedactAndExport({ exporter: new ExportRedactedPdf(writer), verifier, logger });
  const saved: Array<{ bytes: Uint8Array; name: string }> = [];
  const fileSink = { save: (bytes: Uint8Array, name: string) => saved.push({ bytes, name }) };
  const flow = new ExportFlow({ redactAndExport, fileSink, review, inputPageCount: 2, fileName: 'contract.pdf' });
  return { review, verifier, execute, writer, flow, saved, logger };
};

describe('SaveDecision', () => {
  it('offers the save when verified and requires acknowledgement when failed', () => {
    expect(decideSave(report('verified'))).toEqual({ kind: 'offerSave' });
    expect(decideSave(report('failed'))).toEqual({ kind: 'requireAcknowledgement' });
  });
});

describe('RedactAndExport', () => {
  it('plans, exports, verifies and returns the decision; the review is locked meanwhile', async () => {
    const { review, verifier, execute, writer } = setup();
    const modes: string[] = [];
    review.store.subscribe(() => modes.push(review.store.snapshot().mode));
    const redactAndExport = new RedactAndExport({ exporter: new ExportRedactedPdf(writer), verifier, logger: { log: vi.fn() } });
    const result = await redactAndExport.execute(review, 2);
    expect(result.ok && result.value.decision).toEqual({ kind: 'offerSave' });
    expect(modes).toEqual(['exporting', 'editing']);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ inputPageCount: 2, itemsRemoved: 1 }));
  });

  it('never sends document bytes to the writer: only the plan (FR-024)', async () => {
    const { flow, writer } = setup();
    await flow.start();
    expect(Object.keys(writer.plans[0] ?? {}).sort()).toEqual(['areasByPage', 'redactedTexts']);
  });

  it('refuses to export when nothing is selected', async () => {
    const { review, flow } = setup();
    review.deselectAll();
    await flow.start();
    expect(flow.store.get()).toEqual({ kind: 'idle' });
  });
});

describe('ExportFlow', () => {
  it('goes idle → exporting → verified and saves with the -redacted name', async () => {
    const { flow, saved } = setup();
    const states: string[] = [];
    flow.store.subscribe(() => states.push(flow.store.get().kind));
    await flow.start();
    expect(states).toEqual(['exporting', 'verified']);
    expect(flow.save()).toEqual({ ok: true, value: undefined });
    expect(saved[0]?.name).toBe('contract-redacted.pdf');
  });

  it('after a failed verification, saving requires an explicit acknowledgement (FR-026a)', async () => {
    const { flow, saved } = setup('failed');
    await flow.start();
    expect(flow.store.get().kind).toBe('verificationFailed');
    expect(flow.save()).toEqual({ ok: false, error: 'acknowledgementRequired' });
    flow.requestUnverifiedSave();
    expect(flow.store.get().kind).toBe('acknowledgeUnverified');
    expect(flow.save()).toEqual({ ok: false, error: 'acknowledgementRequired' });
    expect(flow.save(confirmUnverifiedSave())).toEqual({ ok: true, value: undefined });
    expect(saved).toHaveLength(1);
  });

  it('cancelling the acknowledgement returns to the failure screen', async () => {
    const { flow } = setup('failed');
    await flow.start();
    flow.requestUnverifiedSave();
    flow.cancelUnverifiedSave();
    expect(flow.store.get().kind).toBe('verificationFailed');
  });

  it('back to review releases the output and returns to idle', async () => {
    const { flow } = setup();
    await flow.start();
    flow.backToReview();
    expect(flow.store.get()).toEqual({ kind: 'idle' });
    expect(flow.save()).toEqual({ ok: false, error: 'nothingToSave' });
  });

  it('reports export failures without a report', async () => {
    const { flow } = setup('verified', new RecordingWriter('writeFailed'));
    await flow.start();
    expect(flow.store.get()).toEqual({ kind: 'exportFailed' });
  });

  it('ignores a second start while exporting', async () => {
    const { flow, execute } = setup();
    await Promise.all([flow.start(), flow.start()]);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe('UnverifiedSaveAcknowledgement', () => {
  it('only a confirmed token counts as an acknowledgement', async () => {
    const { isAcknowledgement } = await import('@app/save-decision');
    expect(isAcknowledgement(confirmUnverifiedSave())).toBe(true);
    expect(isAcknowledgement({})).toBe(false);
    expect(isAcknowledgement(null)).toBe(false);
  });
});

describe('ExportFlow progress', () => {
  it('shows export progress reported by the writer', async () => {
    const doc = reviewDocument();
    const review = new RedactionReview(doc);
    review.addManualText(rangeOf(doc, 'John Smith'));
    const fractions: Array<number | undefined> = [];
    const progressWriter = {
      write: (plan: Parameters<RecordingWriter['write']>[0], progress?: (s: string, f: number) => void) => {
        progress?.('redact', 0.5);
        return new RecordingWriter().write(plan);
      },
    };
    const redactAndExport = new RedactAndExport({ exporter: new ExportRedactedPdf(progressWriter), verifier: { execute: () => Promise.resolve(report('verified')) }, logger: { log: vi.fn() } });
    const flow = new ExportFlow({ redactAndExport, fileSink: { save: vi.fn() }, review, inputPageCount: 2, fileName: 'c.pdf' });
    flow.store.subscribe(() => {
      const state = flow.store.get();
      if (state.kind === 'exporting') fractions.push(state.fraction);
    });
    await flow.start();
    expect(fractions).toEqual([undefined, 0.5]);
  });
});

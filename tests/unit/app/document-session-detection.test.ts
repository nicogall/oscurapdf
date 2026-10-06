import { describe, expect, it, vi } from 'vitest';
import { DetectPii, RULE_DETECTORS, type PiiDetector } from '@detection';
import { CloseDocument, LoadDocument, type PdfContents } from '@ingestion';
import { DocumentSession } from '@app/document-session';
import { ObjectUrls } from '@app/infrastructure/object-urls';
import { FakePdfReader } from '../../support/fakes/fake-pdf-reader';
import { pageText } from '../../support/fakes/page-text-builder';
import { ScriptedRecognizer } from '../../support/fakes/scripted-recognizer';
import { stubWorkspaceFactory } from '../../support/fakes/stub-workspace';

const contents: PdfContents = {
  pages: [{ index: 0 as never, size: { width: 595, height: 842 }, rotation: 0, hasExtractableText: true, hasImages: false }],
  text: [pageText(0, ['Mario Rossi, mario.rossi@example.com, IBAN IT60X0542811101000000123456'])],
};

const openWith = async (detector: PiiDetector) => {
  const reader = FakePdfReader.returning(contents);
  const logger = { log: vi.fn() };
  const session = new DocumentSession({
    loadDocument: new LoadDocument(reader),
    closeDocument: new CloseDocument(reader),
    objectUrls: new ObjectUrls({ createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }),
    logger,
    openWorkspace: stubWorkspaceFactory('verified', detector),
  });
  const bytes = new TextEncoder().encode('%PDF-1.7 x');
  await session.load({ name: 'a.pdf', size: bytes.byteLength, bytes: () => Promise.resolve(bytes.slice().buffer) });
  const state = session.snapshot();
  if (state.kind !== 'reviewing') throw new Error('not reviewing');
  return state.workspace;
};

const settled = async (workspace: Awaited<ReturnType<typeof openWith>>) => {
  await vi.waitFor(() => {
    expect(['done', 'degraded']).toContain(workspace.detection.status.get().kind);
  });
};

describe('detection after load (US2)', () => {
  it('starts automatically and adds candidates to the review as automatic items', async () => {
    const person = { category: 'PERSON' as const, range: { start: 0, end: 11 }, confidence: 'high' as const, method: 'ner' as const };
    const workspace = await openWith(new DetectPii({ rules: RULE_DETECTORS, recognizer: new ScriptedRecognizer([person]) }));
    await settled(workspace);
    expect(workspace.detection.status.get()).toEqual({ kind: 'done', found: 3 });
    expect(workspace.review.store.snapshot().summary).toEqual({ total: 3, automatic: 3, manual: 0, selected: 3 });
  });

  it('shows partial suggestions before detection finishes (segmented detection)', async () => {
    const person = { category: 'PERSON' as const, range: { start: 0, end: 11 }, confidence: 'high' as const, method: 'ner' as const };
    let finish: () => void = () => undefined;
    const detector: PiiDetector = {
      execute: async (_text, _progress, partial) => {
        partial?.([person]);
        await new Promise<void>((resolve) => { finish = resolve; });
        return { candidates: [person], degraded: false };
      },
    };
    const workspace = await openWith(detector);
    await vi.waitFor(() => {
      expect(workspace.review.store.snapshot().items.map((i) => i.text)).toEqual(['Mario Rossi']);
    });
    expect(workspace.detection.status.get().kind).toBe('running');
    finish();
    await settled(workspace);
    expect(workspace.review.store.snapshot().items).toHaveLength(1);
  });

  it('forwards progress while running', async () => {
    const stages: string[] = [];
    const detector: PiiDetector = {
      // Like the real worker: progress arrives asynchronously.
      execute: async (_text, progress) => {
        await Promise.resolve();
        progress?.('ner', 0.5);
        return { candidates: [], degraded: false };
      },
    };
    const reader = FakePdfReader.returning(contents);
    const session = new DocumentSession({
      loadDocument: new LoadDocument(reader),
      closeDocument: new CloseDocument(reader),
      objectUrls: new ObjectUrls({ createObjectURL: () => 'x', revokeObjectURL: vi.fn() }),
      logger: { log: vi.fn() },
      openWorkspace: (loaded) => {
        const workspace = stubWorkspaceFactory('verified', detector)(loaded);
        workspace.detection.status.subscribe(() => {
          const status = workspace.detection.status.get();
          if (status.kind === 'running') stages.push(status.stage);
        });
        return workspace;
      },
    });
    const bytes = new TextEncoder().encode('%PDF-1.7 x');
    await session.load({ name: 'a.pdf', size: bytes.byteLength, bytes: () => Promise.resolve(bytes.slice().buffer) });
    await vi.waitFor(() => {
      expect(stages).toContain('ner');
    });
  });

  it('NER failure → degraded, with rule results still added (constitution III)', async () => {
    const workspace = await openWith(new DetectPii({ rules: RULE_DETECTORS, recognizer: new ScriptedRecognizer('fail') }));
    await settled(workspace);
    // Even without the model, "Mario Rossi" is found by the first-name rule.
    expect(workspace.detection.status.get()).toEqual({ kind: 'degraded', found: 3 });
    expect(workspace.review.store.snapshot().items.map((i) => i.category)).toEqual(['PERSON', 'EMAIL', 'IBAN']);
  });
});

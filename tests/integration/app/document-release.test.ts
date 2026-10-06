import { afterEach, describe, expect, it, vi } from 'vitest';
import * as mupdf from 'mupdf';
import type { PageIndex } from '@shared-kernel';
import { CloseDocument, LoadDocument } from '@ingestion';
import { DocumentSession } from '@app/document-session';
import { ObjectUrls } from '@app/infrastructure/object-urls';
import { DocumentBytes, createDocumentHandlers } from '@workers/handlers/document-handlers';
import type { HandlerContext } from '@workers/protocol';
import { MuPdfRasterizer } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-rasterizer';
import { MuPdfReader } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-reader';
import { MuPdfSession } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-session';
import { MuPdfInspector } from '../../../src/contexts/verification/infrastructure/mupdf-inspector';
import { fixtureBytes } from '../../support/fixtures';
import { stubWorkspaceFactory } from '../../support/fakes/stub-workspace';

const context: HandlerContext = { progress: () => undefined, checkpoint: () => undefined, transfer: () => undefined };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('memory release (FR-031) with the real engines', () => {
  it('document worker: close destroys the MuPDF document and drops the original bytes', async () => {
    const destroy = vi.spyOn(mupdf.Document.prototype, 'destroy');
    const session = new MuPdfSession();
    const bytes = new DocumentBytes();
    const rasterizer = new MuPdfRasterizer(session, (p) => Promise.resolve(p as unknown as ImageBitmap));
    const handlers = createDocumentHandlers({ reader: new MuPdfReader(session), rasterizer, bytes });
    await handlers.read?.(fixtureBytes('contract-it-en.pdf'), context);
    expect(session.current()).toBeDefined();
    await handlers.close?.(null, context);
    expect(destroy).toHaveBeenCalled();
    expect(session.current()).toBeUndefined();
    expect(bytes.current()).toBeUndefined();
    expect(await rasterizer.render(0 as PageIndex, 1)).toEqual({ ok: false, error: 'renderFailed' });
  });

  it('verification worker: the inspector destroys its own document after every run', async () => {
    const destroy = vi.spyOn(mupdf.Document.prototype, 'destroy');
    const plan = { areasByPage: new Map(), redactedTexts: ['john smith'] };
    await new MuPdfInspector().inspect(new Uint8Array(fixtureBytes('contract-it-en.pdf')), plan);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('session: close releases the reader and revokes every object URL', async () => {
    const reader = new MuPdfReader(new MuPdfSession());
    const revoked: string[] = [];
    const objectUrls = new ObjectUrls({ createObjectURL: () => 'blob:out', revokeObjectURL: (u) => revoked.push(u) });
    const session = new DocumentSession({
      loadDocument: new LoadDocument(reader),
      closeDocument: new CloseDocument(reader),
      objectUrls,
      logger: { log: vi.fn() },
      openWorkspace: stubWorkspaceFactory(),
    });
    const data = new Uint8Array(fixtureBytes('contract-it-en.pdf'));
    await session.load({ name: 'c.pdf', size: data.byteLength, bytes: () => Promise.resolve(data.slice().buffer) });
    objectUrls.create(new Blob(['x']));
    await session.close();
    expect(revoked).toEqual(['blob:out']);
    expect(session.snapshot()).toEqual({ kind: 'empty' });
  });
});

import { describe, expect, it } from 'vitest';
import { err, ok } from '@shared-kernel';
import type { PageRasterizer, PdfContents } from '@ingestion';
import { DocumentBytes, createDocumentHandlers } from '@workers/handlers/document-handlers';
import { HandlerError, type HandlerContext } from '@workers/protocol';
import { FakePdfReader } from '../../support/fakes/fake-pdf-reader';

const contents: PdfContents = { pages: [], text: [] };

const context = (): HandlerContext & { transfers: unknown[] } => {
  const transfers: unknown[] = [];
  return {
    transfers,
    progress: () => undefined,
    checkpoint: () => undefined,
    transfer: (...buffers) => transfers.push(...buffers),
  };
};

const rasterizer = (fails = false): PageRasterizer => ({
  render: () =>
    Promise.resolve(fails ? err('renderFailed') : ok({ width: 1, height: 2, image: { close: () => undefined } as ImageBitmap })),
});

const setup = (reader = FakePdfReader.returning(contents), raster = rasterizer()) => {
  const bytes = new DocumentBytes();
  return { bytes, reader, handlers: createDocumentHandlers({ reader, rasterizer: raster, bytes }) };
};

describe('document worker handlers', () => {
  it('read returns contents and keeps the original bytes for export', async () => {
    const { handlers, bytes } = setup();
    const input = new ArrayBuffer(8);
    expect(await handlers.read?.(input, context())).toEqual(contents);
    expect(bytes.current()).toBe(input);
  });

  it('read failures surface as code-only HandlerErrors and keep no bytes', async () => {
    const { handlers, bytes } = setup(FakePdfReader.failing('passwordProtected'));
    await expect(handlers.read?.(new ArrayBuffer(8), context())).rejects.toEqual(new HandlerError('passwordProtected'));
    expect(bytes.current()).toBeUndefined();
  });

  it('render transfers the bitmap', async () => {
    const { handlers } = setup();
    const ctx = context();
    const result = (await handlers.render?.({ page: 0, scale: 1 }, ctx)) as { width: number };
    expect(result.width).toBe(1);
    expect(ctx.transfers).toHaveLength(1);
  });

  it('render failures are reported as renderFailed', async () => {
    const { handlers } = setup(undefined, rasterizer(true));
    await expect(handlers.render?.({ page: 0, scale: 1 }, context())).rejects.toEqual(new HandlerError('renderFailed'));
  });

  it('close releases the reader and drops all buffers (FR-031)', async () => {
    const { handlers, bytes, reader } = setup();
    await handlers.read?.(new ArrayBuffer(8), context());
    await handlers.close?.(null, context());
    expect(reader.closed).toBe(true);
    expect(bytes.current()).toBeUndefined();
  });
});

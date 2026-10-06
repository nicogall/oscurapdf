import { describe, expect, it } from 'vitest';
import { CloseDocument, LoadDocument, RenderPage, type FileHandle, type PageRasterizer, type PdfContents } from '@ingestion';
import { err, ok, type PageIndex } from '@shared-kernel';
import { FakePdfReader } from '../../support/fakes/fake-pdf-reader';
import { pageText } from '../../support/fakes/page-text-builder';

const PDF_BYTES = new TextEncoder().encode('%PDF-1.7\n%fake');

const file = (bytes: Uint8Array, size = bytes.byteLength): FileHandle & { reads: number } => {
  const handle = {
    name: 'contract.pdf',
    size,
    reads: 0,
    bytes: () => {
      handle.reads += 1;
      return Promise.resolve(bytes.slice().buffer);
    },
  };
  return handle;
};

const pageInfo = (index: number, hasExtractableText = true) => ({
  index: index as PageIndex,
  size: { width: 595, height: 842 },
  rotation: 0 as const,
  hasExtractableText,
  hasImages: false,
});

const contents = (pagesWithText: boolean[]): PdfContents => ({
  pages: pagesWithText.map((t, i) => pageInfo(i, t)),
  text: pagesWithText.map((t, i) => pageText(i, t ? [`Page ${i + 1} text`] : [])),
});

describe('LoadDocument', () => {
  it('loads a supported document with its text model', async () => {
    const reader = FakePdfReader.returning(contents([true, true]));
    const result = await new LoadDocument(reader).execute(file(PDF_BYTES));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.document.fileName).toBe('contract.pdf');
    expect(result.value.document.pages).toHaveLength(2);
    expect(result.value.textModel.text).toBe('Page 1 text\fPage 2 text');
    expect(result.value.pagesWithoutText).toEqual([]);
  });

  it('keeps unreadable lines (broken character map) out of the text and reports them (FR-037)', async () => {
    const reader = FakePdfReader.returning({
      pages: [pageInfo(0), pageInfo(1)],
      text: [pageText(0, ['Oggetto: contratto', '\u0003\u0011\u0012\u0005\u0014']), pageText(1, ['Tutto leggibile'])],
    });
    const result = await new LoadDocument(reader).execute(file(PDF_BYTES));
    if (!result.ok) throw new Error('not loaded');
    expect(result.value.textModel.text).toBe('Oggetto: contratto\fTutto leggibile');
    expect(result.value.unreadableText.pages).toEqual([0]);
    expect(result.value.unreadableText.zones).toHaveLength(1);
    expect(result.value.pagesWithoutText).toEqual([]);
  });

  it('refuses files over 50 MB before reading them (no reader call)', async () => {
    const reader = FakePdfReader.returning(contents([true]));
    const handle = file(PDF_BYTES, 52_428_801);
    const result = await new LoadDocument(reader).execute(handle);
    expect(result).toEqual(err({ code: 'tooLarge', limitBytes: 52_428_800 }));
    expect(handle.reads).toBe(0);
    expect(reader.readCalls).toBe(0);
  });

  it('rejects non-PDF bytes without calling the reader', async () => {
    const reader = FakePdfReader.returning(contents([true]));
    const result = await new LoadDocument(reader).execute(file(new TextEncoder().encode('plain text')));
    expect(result).toEqual(err({ code: 'notPdf' }));
    expect(reader.readCalls).toBe(0);
  });

  it.each(['invalid', 'passwordProtected'] as const)('maps reader error %s', async (code) => {
    const result = await new LoadDocument(FakePdfReader.failing(code)).execute(file(PDF_BYTES));
    expect(result).toEqual(err({ code }));
  });

  it('refuses image-only documents', async () => {
    const result = await new LoadDocument(FakePdfReader.returning(contents([false, false]))).execute(file(PDF_BYTES));
    expect(result).toEqual(err({ code: 'imageOnly' }));
  });

  it('lists pages without text for partially supported documents', async () => {
    const result = await new LoadDocument(FakePdfReader.returning(contents([true, false]))).execute(file(PDF_BYTES));
    expect(result.ok && result.value.pagesWithoutText).toEqual([1]);
  });

  it('treats a document with no pages as invalid', async () => {
    const empty = { pages: [], text: [] };
    const result = await new LoadDocument(FakePdfReader.returning(empty)).execute(file(PDF_BYTES));
    expect(result).toEqual(err({ code: 'invalid' }));
  });
});

describe('RenderPage and CloseDocument', () => {
  it('renders through the rasterizer port', async () => {
    const bitmap = { width: 10, height: 20, image: {} as ImageBitmap };
    const rasterizer: PageRasterizer = { render: () => Promise.resolve(ok(bitmap)) };
    expect(await new RenderPage(rasterizer).execute(0, 1)).toEqual(ok(bitmap));
  });

  it('rejects invalid page indexes and scales', async () => {
    const rasterizer: PageRasterizer = { render: () => Promise.resolve(err('renderFailed')) };
    expect(await new RenderPage(rasterizer).execute(-1, 1)).toEqual(err('renderFailed'));
    expect(await new RenderPage(rasterizer).execute(0, 0)).toEqual(err('renderFailed'));
  });

  it('close releases the reader', async () => {
    const reader = FakePdfReader.returning(contents([true]));
    await new CloseDocument(reader).execute();
    expect(reader.closed).toBe(true);
  });
});

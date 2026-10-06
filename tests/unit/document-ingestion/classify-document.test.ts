import { describe, expect, it } from 'vitest';
import { MAX_DOCUMENT_BYTES, classifyBySize, classifyPages, looksLikePdf } from '@ingestion';

const page = (hasExtractableText: boolean) => ({ hasExtractableText });

describe('classifyDocument', () => {
  it('limit is exactly 50 MB (52,428,800 bytes)', () => {
    expect(MAX_DOCUMENT_BYTES).toBe(52_428_800);
  });

  it('is tooLarge only when byteSize > 52,428,800', () => {
    expect(classifyBySize(52_428_800)).toBeUndefined();
    expect(classifyBySize(52_428_801)).toEqual({ kind: 'tooLarge' });
  });

  it('recognises the PDF header anywhere in the first 1024 bytes', () => {
    const encoder = new TextEncoder();
    expect(looksLikePdf(encoder.encode('%PDF-1.7\n...'))).toBe(true);
    expect(looksLikePdf(encoder.encode(`${' '.repeat(100)}%PDF-1.4`))).toBe(true);
    expect(looksLikePdf(encoder.encode('hello world'))).toBe(false);
    expect(looksLikePdf(encoder.encode(`${' '.repeat(1100)}%PDF-1.4`))).toBe(false);
  });

  it('is imageOnly when no page has extractable text', () => {
    expect(classifyPages([page(false), page(false)])).toEqual({ kind: 'imageOnly' });
  });

  it('is partiallySupported and lists the pages without text', () => {
    expect(classifyPages([page(true), page(false), page(true), page(false)])).toEqual({
      kind: 'partiallySupported',
      pagesWithoutText: [1, 3],
    });
  });

  it('is supported when every page has text', () => {
    expect(classifyPages([page(true), page(true)])).toEqual({ kind: 'supported' });
  });

  it('treats a document with no pages as invalid', () => {
    expect(classifyPages([])).toEqual({ kind: 'invalid' });
  });
});

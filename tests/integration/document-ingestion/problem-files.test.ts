import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LoadDocument, type FileHandle } from '@ingestion';
import { MuPdfReader } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-reader';
import { MuPdfSession } from '../../../src/contexts/document-ingestion/infrastructure/mupdf-session';

const DIR = join(import.meta.dirname, '..', '..', 'fixtures', 'pdf');

const handle = (name: string): FileHandle => ({
  name,
  size: statSync(join(DIR, name)).size,
  bytes: () => Promise.resolve(new Uint8Array(readFileSync(join(DIR, name))).buffer),
});

const load = (name: string) => new LoadDocument(new MuPdfReader(new MuPdfSession())).execute(handle(name));

describe('US4 problem files with the real reader', () => {
  it.each([
    ['not-a-pdf.txt', 'notPdf'],
    ['corrupt.pdf', 'invalid'],
    ['51mb.pdf', 'tooLarge'],
    ['locked.pdf', 'passwordProtected'],
    ['scan-only.pdf', 'imageOnly'],
  ])('%s is refused as %s', async (name, code) => {
    const result = await load(name);
    expect(result.ok ? 'loaded' : result.error.code).toBe(code);
  });

  it('a partially scanned PDF loads and lists the page without text', async () => {
    const result = await load('partially-scanned.pdf');
    expect(result.ok && result.value.pagesWithoutText).toEqual([1]);
  });
});

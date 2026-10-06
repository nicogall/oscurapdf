import { describe, expect, it } from 'vitest';
import { CloseDocument, LoadDocument, type FileHandle, type PdfContents } from '@ingestion';
import { DocumentSession } from '@app/document-session';
import { ObjectUrls } from '@app/infrastructure/object-urls';
import type { LogEvent } from '@app/ports/logger';
import { FakePdfReader } from '../../support/fakes/fake-pdf-reader';
import { stubWorkspaceFactory } from '../../support/fakes/stub-workspace';
import { pageText } from '../../support/fakes/page-text-builder';

const SECRET_NAME = 'mario-rossi-medical-record.pdf';
const SECRET_TEXT = 'Mario Rossi diagnosis';

const contents: PdfContents = {
  pages: [{ index: 0 as never, size: { width: 595, height: 842 }, rotation: 0, hasExtractableText: true, hasImages: false }],
  text: [pageText(0, [SECRET_TEXT])],
};

const file = (name = SECRET_NAME, bytes = new TextEncoder().encode('%PDF-1.7 synthetic')): FileHandle => ({
  name,
  size: bytes.byteLength,
  bytes: () => Promise.resolve(bytes.slice().buffer),
});

const fakeUrlApi = () => {
  const revoked: string[] = [];
  let counter = 0;
  return {
    revoked,
    api: { createObjectURL: () => `blob:${++counter}`, revokeObjectURL: (url: string) => revoked.push(url) },
  };
};

const setup = (reader = FakePdfReader.returning(contents)) => {
  const events: LogEvent[] = [];
  const urls = fakeUrlApi();
  const objectUrls = new ObjectUrls(urls.api);
  const session = new DocumentSession({
    loadDocument: new LoadDocument(reader),
    closeDocument: new CloseDocument(reader),
    objectUrls,
    logger: { log: (e) => events.push(e) },
    openWorkspace: stubWorkspaceFactory(),
  });
  return { session, reader, events, urls, objectUrls };
};

describe('ObjectUrls', () => {
  it('ignores revoking unknown URLs and revokes each URL once', () => {
    const urls = fakeUrlApi();
    const objectUrls = new ObjectUrls(urls.api);
    objectUrls.revoke('blob:unknown');
    const url = objectUrls.create(new Blob(['x']));
    objectUrls.revoke(url);
    objectUrls.revokeAll();
    expect(urls.revoked).toEqual([url]);
  });
});

describe('DocumentSession', () => {
  it('starts empty, loads into reviewing and notifies subscribers', async () => {
    const { session } = setup();
    const seen: string[] = [];
    session.subscribe(() => seen.push(session.snapshot().kind));
    expect(session.snapshot().kind).toBe('empty');
    await session.load(file());
    expect(seen).toEqual(['loading', 'reviewing']);
    const state = session.snapshot();
    expect(state.kind === 'reviewing' && state.document.fileName).toBe(SECRET_NAME);
  });

  it('moves to rejected with the reason code', async () => {
    const { session } = setup(FakePdfReader.failing('passwordProtected'));
    await session.load(file());
    expect(session.snapshot()).toEqual({ kind: 'rejected', reason: 'passwordProtected' });
  });

  it('moves to imageOnly for scanned documents (never "checked")', async () => {
    const scanned = { ...contents, pages: contents.pages.map((p) => ({ ...p, hasExtractableText: false })) };
    const { session } = setup(FakePdfReader.returning(scanned));
    await session.load(file());
    expect(session.snapshot()).toEqual({ kind: 'imageOnly' });
  });

  it('requires confirmation before replacing an open document', async () => {
    const { session } = setup();
    await session.load(file());
    expect(await session.load(file('other.pdf'))).toEqual({ ok: false, error: 'confirmReplace' });
    const state = session.snapshot();
    expect(state.kind === 'reviewing' && state.document.fileName).toBe(SECRET_NAME);
    await session.replace(file('other.pdf'));
    const replaced = session.snapshot();
    expect(replaced.kind === 'reviewing' && replaced.document.fileName).toBe('other.pdf');
  });

  it('close/replace releases the reader and revokes object URLs (FR-031)', async () => {
    const { session, reader, urls, objectUrls } = setup();
    await session.load(file());
    const url = objectUrls.create(new Blob(['x']));
    await session.close();
    expect(reader.closed).toBe(true);
    expect(urls.revoked).toEqual([url]);
    expect(session.snapshot()).toEqual({ kind: 'empty' });
  });

  it('never passes document data to the logger', async () => {
    const { session, events } = setup();
    await session.load(file());
    await session.close();
    expect(events.map((e) => e.code)).toEqual(['documentLoaded', 'documentClosed']);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('mario');
    expect(serialized).not.toContain('Rossi');
  });

  it('cancelling while loading discards the late result and releases the reader', async () => {
    let finishRead: () => void = () => undefined;
    const reader = FakePdfReader.returning(contents);
    const slowReader = Object.assign(Object.create(reader) as FakePdfReader, {
      read: () =>
        new Promise((resolve) => {
          finishRead = () => {
            resolve({ ok: true, value: contents });
          };
        }),
    });
    const { session } = setup(slowReader);
    const loading = session.load(file());
    await Promise.resolve();
    await session.close();
    finishRead();
    await loading;
    expect(session.snapshot()).toEqual({ kind: 'empty' });
    expect(slowReader.closed).toBe(true);
  });

  it('dismissing a rejection returns to empty', async () => {
    const { session } = setup(FakePdfReader.failing('invalid'));
    await session.load(file());
    await session.close();
    expect(session.snapshot()).toEqual({ kind: 'empty' });
  });
});

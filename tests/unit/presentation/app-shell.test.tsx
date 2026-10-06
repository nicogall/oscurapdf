import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, type PageIndex } from '@shared-kernel';
import { CloseDocument, LoadDocument, type PdfContents } from '@ingestion';
import type { AppServices } from '@app/views';
import { DocumentSession } from '@app/document-session';
import { ObjectUrls } from '@app/infrastructure/object-urls';
import { AppShell } from '../../../src/presentation/app-shell';
import { FakePdfReader } from '../../support/fakes/fake-pdf-reader';
import { stubWorkspaceFactory } from '../../support/fakes/stub-workspace';
import { pageText } from '../../support/fakes/page-text-builder';
import { renderWithServices } from '../../support/render-with-services';

const page = (index: number) => ({
  index: index as PageIndex,
  size: { width: 200, height: 300 },
  rotation: 0 as const,
  hasExtractableText: true,
  hasImages: false,
});

const contents: PdfContents = {
  pages: [page(0), page(1)],
  text: [pageText(0, ['First page text']), pageText(1, ['Second page text'])],
};

const pdfFile = (name = 'contract.pdf') => new File(['%PDF-1.7 synthetic'], name, { type: 'application/pdf' });

const services = (reader = FakePdfReader.returning(contents)) => {
  const bitmap = { width: 10, height: 10, image: { close: vi.fn() } as unknown as ImageBitmap };
  const renderPage = vi.fn(() => Promise.resolve(ok(bitmap)));
  const preferences = { readLanguage: () => undefined, writeLanguage: vi.fn() };
  const session = new DocumentSession({
    loadDocument: new LoadDocument(reader),
    closeDocument: new CloseDocument(reader),
    objectUrls: new ObjectUrls({ createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }),
    logger: { log: vi.fn() },
    openWorkspace: stubWorkspaceFactory(),
  });
  const all: AppServices = { session, renderPage, preferences, logger: { log: vi.fn() } };
  return { all, renderPage, preferences, session };
};

const upload = async (file: File) => {
  await userEvent.upload(screen.getByLabelText('Choose a PDF'), file);
};

describe('AppShell', () => {
  beforeEach(() => {
    // happy-dom's IntersectionObserver never fires; without it every page counts as visible.
    vi.stubGlobal('IntersectionObserver', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens a document, renders every page with its text layer', async () => {
    const { all, renderPage } = services();
    const { container } = await renderWithServices(<AppShell />, all);
    await upload(pdfFile());
    await waitFor(() => {
      expect(container.querySelectorAll('.page')).toHaveLength(2);
    });
    expect(screen.getByLabelText('Page 2')).toBeTruthy();
    expect(container.querySelector('[data-char-start]')?.textContent).toBe('First page text');
    await waitFor(() => {
      expect(renderPage).toHaveBeenCalledTimes(2);
    });
  });

  it('asks before replacing and keeps the document when cancelled', async () => {
    const { all, session } = services();
    await renderWithServices(<AppShell />, all);
    await upload(pdfFile());
    await waitFor(() => {
      expect(session.snapshot().kind).toBe('reviewing');
    });
    fireEvent.drop(document.querySelector('.app') as Element, { dataTransfer: { files: [pdfFile('other.pdf')] } });
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: 'Keep current document' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const state = session.snapshot();
    expect(state.kind === 'reviewing' && state.document.fileName).toBe('contract.pdf');
  });

  it('replaces the document after confirmation', async () => {
    const { all, session } = services();
    await renderWithServices(<AppShell />, all);
    await upload(pdfFile());
    await waitFor(() => {
      expect(session.snapshot().kind).toBe('reviewing');
    });
    fireEvent.drop(document.querySelector('.app') as Element, { dataTransfer: { files: [pdfFile('other.pdf')] } });
    await userEvent.click(await screen.findByRole('button', { name: 'Discard and open' }));
    await waitFor(() => {
      const state = session.snapshot();
      expect(state.kind === 'reviewing' && state.document.fileName).toBe('other.pdf');
    });
  });

  it('the logo scrolls the start page to the top', async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    await renderWithServices(<AppShell />, services().all);
    await userEvent.click(screen.getByRole('link', { name: 'Redact PDF' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('with a document open, the logo asks before going back to the start page', async () => {
    const { all, session } = services();
    await renderWithServices(<AppShell />, all);
    await upload(pdfFile());
    await waitFor(() => { expect(session.snapshot().kind).toBe('reviewing'); });
    await userEvent.click(screen.getByRole('link', { name: 'Redact PDF' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep working' }));
    expect(session.snapshot().kind).toBe('reviewing');
    await userEvent.click(screen.getByRole('link', { name: 'Redact PDF' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close document' }));
    await waitFor(() => { expect(session.snapshot().kind).toBe('empty'); });
  });

  it('from an error screen, the logo goes straight back to the start page', async () => {
    const { all, session } = services(FakePdfReader.failing('invalid'));
    await renderWithServices(<AppShell />, all);
    await upload(pdfFile('damaged.pdf'));
    await waitFor(() => { expect(session.snapshot().kind).toBe('rejected'); });
    await userEvent.click(screen.getByRole('link', { name: 'Redact PDF' }));
    await waitFor(() => { expect(session.snapshot().kind).toBe('empty'); });
  });

  it('ignores drops without files', async () => {
    const { all, session } = services();
    await renderWithServices(<AppShell />, all);
    fireEvent.drop(document.querySelector('.app') as Element, { dataTransfer: { files: [] } });
    expect(session.snapshot().kind).toBe('empty');
  });

  it('offers no language switch while the UI is Italian only (2026-10-01)', async () => {
    await renderWithServices(<AppShell />, services().all);
    expect(screen.queryByLabelText('Language')).toBeNull();
  });

  it('switches language without resetting the document, when several are offered (FR-033)', async () => {
    const { all, preferences, session } = services();
    await renderWithServices(<AppShell languages={['en', 'it']} />, all);
    await upload(pdfFile());
    await waitFor(() => {
      expect(session.snapshot().kind).toBe('reviewing');
    });
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'it');
    expect(preferences.writeLanguage).toHaveBeenCalledWith('it');
    await screen.findByLabelText('Lingua');
    expect(session.snapshot().kind).toBe('reviewing');
  });

  it('cancelling while loading returns to the empty screen', async () => {
    const never = Object.assign(Object.create(FakePdfReader.returning(contents)) as FakePdfReader, {
      read: () => new Promise(() => undefined),
    });
    const { all } = services(never);
    await renderWithServices(<AppShell />, all);
    await upload(pdfFile());
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Drop your PDF here')).toBeTruthy();
  });
});

describe('AppShell drag and drop', () => {
  it('accepts dragover anywhere so a file can be dropped on the page', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { all } = services();
    await renderWithServices(<AppShell />, all);
    expect(fireEvent.dragOver(document.querySelector('.app') as Element)).toBe(false);
    vi.unstubAllGlobals();
  });
});

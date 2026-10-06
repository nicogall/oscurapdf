import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, type PageIndex } from '@shared-kernel';
import { CloseDocument, LoadDocument, type PdfContents } from '@ingestion';
import { DocumentSession } from '@app/document-session';
import { ObjectUrls } from '@app/infrastructure/object-urls';
import type { AppServices } from '@app/views';
import type { PiiDetector } from '@detection';
import { AppShell } from '../../../src/presentation/app-shell';
import { FakePdfReader } from '../../support/fakes/fake-pdf-reader';
import { pageText } from '../../support/fakes/page-text-builder';
import { stubWorkspaceFactory } from '../../support/fakes/stub-workspace';
import { renderWithServices } from '../../support/render-with-services';

const contents: PdfContents = {
  pages: [0, 1].map((i) => ({ index: i as PageIndex, size: { width: 300, height: 400 }, rotation: 0 as const, hasExtractableText: true, hasImages: false })),
  text: [pageText(0, ['The agreement is between ACME', 'Holdings Ltd. and John Smith.']), pageText(1, ['acme holdings ltd. pays.'])],
};

const open = async (outcome: 'verified' | 'failed' = 'verified', detector?: PiiDetector) => {
  const reader = FakePdfReader.returning(contents);
  const session = new DocumentSession({
    loadDocument: new LoadDocument(reader),
    closeDocument: new CloseDocument(reader),
    objectUrls: new ObjectUrls({ createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }),
    logger: { log: vi.fn() },
    openWorkspace: stubWorkspaceFactory(outcome, detector),
  });
  const bitmap = { width: 1, height: 1, image: { close: vi.fn() } as unknown as ImageBitmap };
  const services: AppServices = { session, renderPage: () => Promise.resolve(ok(bitmap)), preferences: { readLanguage: () => undefined, writeLanguage: vi.fn() }, logger: { log: vi.fn() } };
  const view = await renderWithServices(<AppShell />, services);
  await userEvent.upload(screen.getByLabelText('Choose a PDF'), new File(['%PDF-1.7 synthetic'], 'contract.pdf'));
  await screen.findByText(/contract\.pdf · /);
  return { view, session };
};

/** Selects characters of the first text span, as the user would with the mouse. */
const selectInFirstSpan = (start: number, end: number) => {
  const text = document.querySelector('[data-char-start="0"]')?.firstChild;
  if (!(text instanceof Text)) throw new Error('text layer not rendered');
  const range = document.createRange();
  range.setStart(text, start);
  range.setEnd(text, end);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
};

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReviewingScreen list actions', () => {
  it('select all, deselect all and remove act on the review', async () => {
    const { session } = await open();
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    await userEvent.click(screen.getByRole('button', { name: 'Deselect all' }));
    const state = session.snapshot();
    if (state.kind !== 'reviewing') throw new Error('not reviewing');
    expect(state.workspace.review.store.snapshot().summary.selected).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(state.workspace.review.store.snapshot().summary.selected).toBe(1);
    await userEvent.click(screen.getByLabelText('Redact "ACME"'));
    await userEvent.click(screen.getByLabelText('Redact "ACME"'));
    await userEvent.click(screen.getByRole('button', { name: 'Remove ACME' }));
    expect(state.workspace.review.store.snapshot().items).toHaveLength(0);
  });

  it('draw mode: a drawn rectangle becomes an area redaction', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Select area' }));
    const layer = (await screen.findAllByTestId('area-tool'))[0] as Element;
    fireEvent.pointerDown(layer, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(layer, { clientX: 100, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(layer, { clientX: 100, clientY: 60, pointerId: 1 });
    expect(await screen.findByRole('button', { name: 'Area, page 1' })).toBeTruthy();
  });
});

describe('ReviewingScreen', () => {
  it('shows file name and size, and disables Redact & Export while nothing is selected (FR-002)', async () => {
    await open();
    expect(screen.getByText(/contract\.pdf · 18 B/)).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Redact & Export' }).disabled).toBe(true);
    expect(screen.getByText('Select at least one item to redact.')).toBeTruthy();
  });

  it('select text → Redact adds a MANUAL item covering all occurrences, with overlays', async () => {
    await open();
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    expect(screen.getByText('ACME')).toBeTruthy();
    expect(screen.getByText('×2')).toBeTruthy();
    expect(screen.getAllByTestId('redaction-overlay')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Redact' })).toBeNull();
  });

  it('navigating to an item highlights its occurrence', async () => {
    await open();
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    await userEvent.click(screen.getByRole('button', { name: 'ACME' }));
    expect(document.querySelectorAll('.overlay--focused')).toHaveLength(1);
  });

  it('Redact & Export → verified → Save → Back to review', async () => {
    const { session } = await open();
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    await userEvent.click(screen.getByRole('button', { name: 'Redact & Export' }));
    await screen.findByText('Redaction complete');
    await userEvent.click(screen.getByRole('button', { name: 'Save redacted PDF' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Redact & Export' })).toBeTruthy();
    });
    expect(session.snapshot().kind).toBe('reviewing');
  });

  it('failed verification → Save anyway → acknowledge → Save', async () => {
    await open('failed');
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    await userEvent.click(screen.getByRole('button', { name: 'Redact & Export' }));
    await screen.findByText(/We could not verify this redaction/);
    expect(screen.queryByText('Redaction complete')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save anyway…' }));
    await userEvent.click(screen.getByLabelText('I understand this file may still contain the redacted information'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

const reviewOf = (session: DocumentSession) => {
  const state = session.snapshot();
  if (state.kind !== 'reviewing') throw new Error('not reviewing');
  return state.workspace.review;
};

describe('ReviewingScreen undo / redo', () => {
  it('Cmd+Z (macOS) and Ctrl+Z (Windows) undo; Cmd+Shift+Z, Ctrl+Shift+Z and Ctrl+Y redo', async () => {
    const { session } = await open();
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    const items = () => reviewOf(session).store.snapshot().items.length;
    for (const [undo, redo] of [
      [{ metaKey: true }, { metaKey: true, shiftKey: true }],
      [{ ctrlKey: true }, { ctrlKey: true, shiftKey: true }],
      [{ ctrlKey: true }, { ctrlKey: true, key: 'y' }],
    ] as const) {
      fireEvent.keyDown(window, { key: 'z', ...undo });
      await waitFor(() => { expect(items()).toBe(0); });
      fireEvent.keyDown(window, { key: 'z', ...redo });
      await waitFor(() => { expect(items()).toBe(1); });
    }
  });

  it('the Undo and Redo buttons follow the history', async () => {
    await open();
    const undo = screen.getByRole<HTMLButtonElement>('button', { name: 'Undo' });
    const redo = screen.getByRole<HTMLButtonElement>('button', { name: 'Redo' });
    expect([undo.disabled, redo.disabled]).toEqual([true, true]);
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByText('ACME')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByText('ACME')).toBeTruthy();
  });

  it('leaves Ctrl+Z to text fields (their own native undo)', async () => {
    const { session } = await open();
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    const field = document.body.appendChild(document.createElement('input'));
    fireEvent.keyDown(field, { key: 'z', ctrlKey: true });
    expect(reviewOf(session).store.snapshot().items).toHaveLength(1);
    field.remove();
  });

  it('shortcuts are off while the export screens are shown', async () => {
    const { session } = await open();
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    await userEvent.click(screen.getByRole('button', { name: 'Redact & Export' }));
    await screen.findByText('Redaction complete');
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(reviewOf(session).store.snapshot().items).toHaveLength(1);
  });
});

describe('ReviewingScreen close (X)', () => {
  it('asks for confirmation; "Keep working" and Esc keep the document', async () => {
    const { session } = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Close document' }));
    expect(screen.getByRole('dialog').textContent).toContain('Close this document?');
    await userEvent.click(screen.getByRole('button', { name: 'Keep working' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Close document' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(session.snapshot().kind).toBe('reviewing');
  });

  it('confirming returns to the start page, ready for the next document', async () => {
    const { session } = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Close document' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close document' }));
    expect(await screen.findByText('Drop your PDF here')).toBeTruthy();
    expect(session.snapshot().kind).toBe('empty');
  });
});

describe('ReviewingScreen: X on a black box', () => {
  it('hovering a box offers an X that removes the item, undoable; none in draw mode', async () => {
    const { session } = await open();
    selectInFirstSpan(25, 29);
    await userEvent.click(await screen.findByRole('button', { name: 'Redact' }));
    const [box] = screen.getAllByTestId('redaction-overlay');
    if (box === undefined) throw new Error('no box');
    fireEvent.pointerEnter(box);
    fireEvent.click(screen.getByRole('button', { hidden: true, name: 'Remove “ACME” from all 2 places' }));
    expect(reviewOf(session).store.snapshot().items).toHaveLength(0);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await waitFor(() => { expect(screen.getAllByTestId('redaction-overlay')).toHaveLength(2); });
    await userEvent.click(screen.getByRole('button', { name: 'Select area' }));
    const [again] = screen.getAllByTestId('redaction-overlay');
    if (again !== undefined) fireEvent.pointerEnter(again);
    expect(screen.queryByRole('button', { hidden: true, name: /Remove “ACME”/ })).toBeNull();
  });

  it('on an automatic suggestion the X only deselects it (it stays in the list)', async () => {
    const acme = { category: 'CONTEXTUAL_ID' as const, range: { start: 25, end: 29 }, confidence: 'high' as const, method: 'rule' as const };
    const { session } = await open('verified', { execute: () => Promise.resolve({ candidates: [acme], degraded: false }) });
    await waitFor(() => { expect(screen.getAllByTestId('redaction-overlay').length).toBeGreaterThan(0); });
    const [box] = screen.getAllByTestId('redaction-overlay');
    if (box === undefined) throw new Error('no box');
    fireEvent.pointerEnter(box);
    fireEvent.click(screen.getByRole('button', { hidden: true, name: /Do not redact “ACME”/ }));
    expect(reviewOf(session).store.snapshot().items.map((i) => [i.text, i.selected])).toEqual([['ACME', false]]);
  });
});

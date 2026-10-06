import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Redaction, RedactionId, ReviewSnapshot } from '@app/views';
import { ReviewList } from '../../../src/presentation/review-list/review-list';
import { renderWithServices } from '../../support/render-with-services';

const occurrence = (page: number) => ({ areas: [{ page: page as never, box: { x: 0, y: 0, width: 1, height: 1 } }] });

const manual: Redaction = {
  id: 'm' as RedactionId, kind: 'text', text: 'ACME Holdings Ltd.', key: 'acme holdings ltd.',
  occurrences: [occurrence(0), occurrence(0), occurrence(1)], category: 'MANUAL', source: 'manual', confidence: 'userConfirmed', selected: true,
};
const automatic: Redaction = {
  id: 'a' as RedactionId, kind: 'text', text: 'x'.repeat(80), key: 'x', occurrences: [occurrence(0)],
  category: 'EMAIL', source: 'automatic', confidence: 'high', selected: false,
};
const area: Redaction = { ...manual, id: 'r' as RedactionId, kind: 'area', occurrences: [occurrence(2)] };

const snapshot = (items: Redaction[]): ReviewSnapshot => ({
  items,
  summary: { total: items.length, automatic: 1, manual: items.length - 1, selected: 1 },
  mode: 'editing',
  history: { canUndo: false, canRedo: false },
});

const actions = () => ({
  onSelect: vi.fn(), onDeselect: vi.fn(), onDelete: vi.fn(), onNavigate: vi.fn<(item: Redaction, occurrence: number) => void>(), onSelectAll: vi.fn(), onDeselectAll: vi.fn(),
});

describe('ReviewList', () => {
  it('shows the summary counts', async () => {
    await renderWithServices(<ReviewList snapshot={snapshot([manual, automatic])} actions={actions()} />);
    expect(screen.getByText('2 potential sensitive items')).toBeTruthy();
    expect(screen.getByText('1 detected automatically')).toBeTruthy();
    expect(screen.getByText('1 manually selected')).toBeTruthy();
  });

  it('shows label, MANUAL badge, ×N, truncation and "Area, page N"', async () => {
    await renderWithServices(<ReviewList snapshot={snapshot([manual, automatic, area])} actions={actions()} />);
    expect(screen.getByText('ACME Holdings Ltd.')).toBeTruthy();
    expect(screen.getAllByText('MANUAL')).toHaveLength(2);
    expect(screen.getAllByText('×3')).toHaveLength(1);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText(`${'x'.repeat(59)}…`)).toBeTruthy();
    expect(screen.getByText('Area, page 3')).toBeTruthy();
  });

  it('toggles selection, deletes manual items only, and bulk-selects', async () => {
    const a = actions();
    await renderWithServices(<ReviewList snapshot={snapshot([manual, automatic])} actions={a} />);
    await userEvent.click(screen.getByLabelText('Redact "ACME Holdings Ltd."'));
    expect(a.onDeselect).toHaveBeenCalledWith('m');
    await userEvent.click(screen.getByLabelText(`Redact "${'x'.repeat(59)}…"`));
    expect(a.onSelect).toHaveBeenCalledWith('a');
    expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Remove ACME Holdings Ltd.' }));
    expect(a.onDelete).toHaveBeenCalledWith('m');
    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    await userEvent.click(screen.getByRole('button', { name: 'Deselect all' }));
    expect(a.onSelectAll).toHaveBeenCalled();
    expect(a.onDeselectAll).toHaveBeenCalled();
  });

  it('clicking an item navigates and cycles through its occurrences', async () => {
    const a = actions();
    await renderWithServices(<ReviewList snapshot={snapshot([manual])} actions={a} />);
    const label = screen.getByRole('button', { name: 'ACME Holdings Ltd.' });
    for (let i = 0; i < 4; i++) await userEvent.click(label);
    expect(a.onNavigate.mock.calls.map((c) => c[1])).toEqual([0, 1, 2, 0]);
  });

  it('explains how to add items when the list is empty', async () => {
    await renderWithServices(<ReviewList snapshot={snapshot([])} actions={actions()} />);
    expect(screen.getByText('Select text in the document and choose Redact to add it here.')).toBeTruthy();
  });
});

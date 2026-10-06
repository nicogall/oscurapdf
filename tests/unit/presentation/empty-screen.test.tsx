import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyScreen } from '../../../src/presentation/screens/empty-screen';
import { LoadingScreen } from '../../../src/presentation/screens/loading-screen';
import { ReplaceDialog } from '../../../src/presentation/screens/replace-dialog';
import { renderWithServices } from '../../support/render-with-services';

const pdf = () => new File(['%PDF-1.7'], 'contract.pdf', { type: 'application/pdf' });

describe('EmptyScreen', () => {
  it('shows the title and the privacy promise', async () => {
    await renderWithServices(<EmptyScreen onFile={vi.fn()} />);
    expect(screen.getByText('Your document never leaves this device.')).toBeTruthy();
    expect(screen.getByText('Drop your PDF here')).toBeTruthy();
  });

  it('accepts a dropped file', async () => {
    const onFile = vi.fn();
    await renderWithServices(<EmptyScreen onFile={onFile} />);
    const file = pdf();
    fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('accepts a file from the picker', async () => {
    const onFile = vi.fn();
    await renderWithServices(<EmptyScreen onFile={onFile} />);
    const file = pdf();
    await userEvent.upload(screen.getByLabelText('Choose a PDF'), file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('highlights the drop zone while a file is dragged over it', async () => {
    await renderWithServices(<EmptyScreen onFile={vi.fn()} />);
    const zone = screen.getByTestId('drop-zone');
    fireEvent.dragOver(zone);
    expect(zone.className).toContain('drop-zone--active');
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain('drop-zone--active');
  });

  it('presents how it works, what it finds and the FAQ', async () => {
    await renderWithServices(<EmptyScreen onFile={vi.fn()} />, {}, 'it');
    for (const name of ['Come funziona', 'Cosa trova e cosa no', 'Domande']) expect(screen.getByRole('heading', { level: 2, name })).toBeTruthy();
    expect(screen.getByText('Il mio documento viene caricato da qualche parte?')).toBeTruthy();
  });

  it('ignores a drop without files', async () => {
    const onFile = vi.fn();
    await renderWithServices(<EmptyScreen onFile={onFile} />);
    fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files: [] } });
    expect(onFile).not.toHaveBeenCalled();
  });

  it('ignores a picker change without a file', async () => {
    const onFile = vi.fn();
    await renderWithServices(<EmptyScreen onFile={onFile} />);
    fireEvent.change(screen.getByLabelText('Choose a PDF'), { target: { files: [] } });
    expect(onFile).not.toHaveBeenCalled();
  });

  it('renders in Italian', async () => {
    await renderWithServices(<EmptyScreen onFile={vi.fn()} />, {}, 'it');
    expect(screen.getByText('Il tuo documento non lascia mai questo dispositivo.')).toBeTruthy();
  });
});

describe('LoadingScreen', () => {
  it('shows progress and cancels', async () => {
    const onCancel = vi.fn();
    await renderWithServices(<LoadingScreen onCancel={onCancel} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('ReplaceDialog', () => {
  it('keeps the current document by default and confirms on request', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    await renderWithServices(<ReplaceDialog onConfirm={onConfirm} onCancel={onCancel} />);
    const keep = screen.getByRole('button', { name: 'Keep current document' });
    expect(document.activeElement).toBe(keep);
    await userEvent.click(keep);
    expect(onCancel).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Discard and open' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

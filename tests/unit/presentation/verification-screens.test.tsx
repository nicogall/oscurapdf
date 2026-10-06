import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { VerificationReport } from '@app/views';
import { AcknowledgeUnverifiedDialog } from '../../../src/presentation/export/acknowledge-unverified-dialog';
import { ExportFailedScreen } from '../../../src/presentation/export/export-failed-screen';
import { ExportingScreen } from '../../../src/presentation/export/exporting-screen';
import { VerificationFailedScreen } from '../../../src/presentation/export/verification-failed-screen';
import { VerifiedScreen } from '../../../src/presentation/export/verified-screen';
import { renderWithServices } from '../../support/render-with-services';

const verified: VerificationReport = {
  itemsRemoved: 17,
  checks: [
    { kind: 'validPdf', passed: true, failures: [] },
    { kind: 'textAbsent', passed: true, failures: [] },
  ],
  outcome: 'verified',
};
const failed: VerificationReport = {
  itemsRemoved: 3,
  checks: [
    { kind: 'validPdf', passed: true, failures: [] },
    { kind: 'textAbsent', passed: false, failures: [{ page: 0, redactionIndex: 0 }, { page: 2, redactionIndex: 0 }] },
  ],
  outcome: 'failed',
};

const SAFE_WORDING = /complete|safe(ly)? redacted|✓ Redacted content not found/i;

describe('VerifiedScreen', () => {
  it('shows "Redaction complete", the count and every check ✓, and saves', async () => {
    const onSave = vi.fn();
    const { container } = await renderWithServices(<VerifiedScreen report={verified} onSave={onSave} onBack={vi.fn()} />);
    expect(screen.getByText('Redaction complete')).toBeTruthy();
    expect(screen.getByText('17 items removed')).toBeTruthy();
    expect(screen.getByText(/what you redacted is no longer there/)).toBeTruthy();
    // The checks are one click away, not a long list (FR-026).
    expect(container.querySelector('details')?.open).toBe(false);
    expect(screen.getByText('Details of the 2 checks')).toBeTruthy();
    expect(container.querySelectorAll('.check--passed')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Save redacted PDF' }));
    expect(onSave).toHaveBeenCalled();
  });
});

describe('VerificationFailedScreen (FR-026)', () => {
  it('uses the exact failure copy, lists failed checks with page numbers, and never says complete/safe', async () => {
    const { container } = await renderWithServices(<VerificationFailedScreen report={failed} onBack={vi.fn()} onSaveAnyway={vi.fn()} />);
    expect(screen.getByText(/We could not verify this redaction\./)).toBeTruthy();
    expect(screen.getByText('The document was not marked as safely redacted.')).toBeTruthy();
    expect(screen.getByText(/page 1, 3/)).toBeTruthy();
    expect(container.querySelectorAll('.check--passed')).toHaveLength(0);
    expect(container.textContent.replace('not marked as safely redacted', '')).not.toMatch(SAFE_WORDING);
  });

  it('focuses Back to review by default and offers Save anyway', async () => {
    const onSaveAnyway = vi.fn();
    await renderWithServices(<VerificationFailedScreen report={failed} onBack={vi.fn()} onSaveAnyway={onSaveAnyway} />);
    expect(document.activeElement?.textContent).toBe('Back to review');
    await userEvent.click(screen.getByRole('button', { name: 'Save anyway…' }));
    expect(onSaveAnyway).toHaveBeenCalled();
  });
});

describe('AcknowledgeUnverifiedDialog (FR-026a)', () => {
  it('enables Save only when the checkbox is ticked; Cancel is the default', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    await renderWithServices(<AcknowledgeUnverifiedDialog onSave={onSave} onCancel={onCancel} />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(document.activeElement?.textContent).toBe('Cancel');
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByLabelText('I understand this file may still contain the redacted information'));
    expect((save as HTMLButtonElement).disabled).toBe(false);
    await userEvent.click(save);
    expect(onSave).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('Exporting and export-failed screens', () => {
  it('shows progress while exporting, without any result wording', async () => {
    const { container } = await renderWithServices(<ExportingScreen fraction={0.5} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(container.textContent).not.toMatch(SAFE_WORDING);
  });

  it('explains that nothing was saved', async () => {
    const onBack = vi.fn();
    await renderWithServices(<ExportFailedScreen onBack={onBack} />);
    expect(screen.getByText('Nothing was saved. Your document is unchanged.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('renders in Italian', async () => {
    await renderWithServices(<VerifiedScreen report={verified} onSave={vi.fn()} onBack={vi.fn()} />, {}, 'it');
    expect(screen.getByText('Oscuramento completato')).toBeTruthy();
  });
});

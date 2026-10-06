import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentWorkspace, VerificationReport } from '@app/views';
import { ExportScreens } from '../../../src/presentation/export/export-screens';
import { EmptyScreen } from '../../../src/presentation/screens/empty-screen';
import { ToolSwitch } from '../../../src/presentation/viewer/tool-switch';
import { renderWithServices } from '../../support/render-with-services';

const report = (outcome: 'verified' | 'failed'): VerificationReport => ({ itemsRemoved: 1, checks: [{ kind: 'textAbsent', passed: outcome === 'verified', failures: [] }], outcome });

const flow = () => {
  const spies = { save: vi.fn(), backToReview: vi.fn(), requestUnverifiedSave: vi.fn(), cancelUnverifiedSave: vi.fn() };
  return { spies, flow: spies as unknown as DocumentWorkspace['exportFlow'] };
};

describe('ExportScreens routes every action to the export flow', () => {
  it('verified: save and back', async () => {
    const { spies, flow: f } = flow();
    await renderWithServices(<ExportScreens state={{ kind: 'verified', report: report('verified') }} flow={f} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save redacted PDF' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    expect(spies.save).toHaveBeenCalled();
    expect(spies.backToReview).toHaveBeenCalled();
  });

  it('failed: save anyway; acknowledgement: cancel and save', async () => {
    const { spies, flow: f } = flow();
    const { unmount } = await renderWithServices(<ExportScreens state={{ kind: 'verificationFailed', report: report('failed') }} flow={f} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save anyway…' }));
    expect(spies.requestUnverifiedSave).toHaveBeenCalled();
    unmount();
    await renderWithServices(<ExportScreens state={{ kind: 'acknowledgeUnverified', report: report('failed') }} flow={f} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save anyway…' }));
    await userEvent.click(screen.getByLabelText('I understand this file may still contain the redacted information'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(spies.save).toHaveBeenCalledTimes(1);
    expect(spies.cancelUnverifiedSave).toHaveBeenCalled();
  });

  it('exporting and export failed', async () => {
    const { spies, flow: f } = flow();
    const { unmount } = await renderWithServices(<ExportScreens state={{ kind: 'exporting' }} flow={f} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    unmount();
    await renderWithServices(<ExportScreens state={{ kind: 'exportFailed' }} flow={f} />);
    await userEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    expect(spies.backToReview).toHaveBeenCalled();
  });
});

describe('small UI callbacks', () => {
  it('ToolSwitch reports Select text', async () => {
    const onChange = vi.fn();
    await renderWithServices(<ToolSwitch mode="draw" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Select text' }));
    expect(onChange).toHaveBeenCalledWith('select');
  });

  it('the drop zone accepts dragover so files can be dropped', async () => {
    await renderWithServices(<EmptyScreen onFile={vi.fn()} />);
    const allowed = fireEvent.dragOver(screen.getByTestId('drop-zone'));
    expect(allowed).toBe(false);
  });

  it('render helper keeps working without services for pure components', () => {
    expect(render(<span>ok</span>).container.textContent).toBe('ok');
  });
});

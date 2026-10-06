import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImageOnlyScreen } from '../../../src/presentation/screens/image-only-screen';
import { NotCheckedPagesBanner } from '../../../src/presentation/screens/not-checked-pages-banner';
import { RejectedScreen } from '../../../src/presentation/screens/rejected-screen';
import { renderWithServices } from '../../support/render-with-services';

const CHECKED_WORDING = /\bchecked\b(?! automatically)|no pii|safe|complete/i;

describe('RejectedScreen', () => {
  it.each([
    ['notPdf', 'This file is not a PDF'],
    ['invalid', 'damaged'],
    ['tooLarge', '50 MB'],
    ['passwordProtected', 'password-protected'],
  ] as const)('%s shows its own message and a way back, never "checked"', async (reason, text) => {
    const onBack = vi.fn();
    const { container } = await renderWithServices(<RejectedScreen reason={reason} onBack={onBack} />);
    expect(screen.getByRole('alert').textContent).toContain(text);
    expect(container.textContent).not.toMatch(CHECKED_WORDING);
    await userEvent.click(screen.getByRole('button', { name: 'Choose another file' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('is translated', async () => {
    await renderWithServices(<RejectedScreen reason="tooLarge" onBack={vi.fn()} />, {}, 'it');
    expect(screen.getByRole('alert').textContent).toContain('50 MB');
  });
});

describe('ImageOnlyScreen', () => {
  it('shows the exact message and never claims the document was checked', async () => {
    const { container } = await renderWithServices(<ImageOnlyScreen onBack={vi.fn()} />);
    expect(screen.getByText('This PDF appears to be scanned or image-based. Automatic text redaction is not currently supported.')).toBeTruthy();
    expect(container.textContent).not.toMatch(CHECKED_WORDING);
  });
});

describe('NotCheckedPagesBanner', () => {
  it('lists the pages without text (1-based)', async () => {
    await renderWithServices(<NotCheckedPagesBanner pages={[1, 3] as never} />);
    expect(screen.getByRole('status').textContent).toContain('not checked automatically: 2, 4');
  });

  it('reports pages with unreadable text separately, never as checked (FR-037)', async () => {
    await renderWithServices(<NotCheckedPagesBanner pages={[]} unreadablePages={[0, 2] as never} />);
    const banner = screen.getByRole('status').textContent;
    expect(banner).toContain('cannot be read automatically on pages: 1, 3');
    expect(banner).not.toMatch(CHECKED_WORDING);
  });

  it('shows both notices when a document has pages without text and unreadable text', async () => {
    await renderWithServices(<NotCheckedPagesBanner pages={[1] as never} unreadablePages={[0] as never} />);
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('renders nothing when every page has text', async () => {
    const { container } = await renderWithServices(<NotCheckedPagesBanner pages={[]} />);
    expect(container.textContent).toBe('');
  });
});

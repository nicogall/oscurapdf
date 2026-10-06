import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PageIndex } from '@shared-kernel';
import { UnreadableZones } from '../../../src/presentation/viewer/unreadable-zones';
import { renderWithServices } from '../../support/render-with-services';

const PAGE = { width: 200, height: 300 };
const zones = [
  { page: 0 as PageIndex, box: { x: 50, y: 100, width: 40, height: 10 } },
  { page: 1 as PageIndex, box: { x: 10, y: 10, width: 40, height: 10 } },
];

describe('UnreadableZones (FR-037)', () => {
  it('outlines the zones of its page only, with an explanation', async () => {
    await renderWithServices(<UnreadableZones page={0} pageSize={PAGE} scale={2} zones={zones} onArea={vi.fn()} />);
    const [zone, ...others] = screen.getAllByTestId('unreadable-zone');
    expect(others).toHaveLength(0);
    expect(zone?.style.left).toBe('96px');
    expect(zone?.style.top).toBe('196px');
    expect(zone?.getAttribute('title')).toMatch(/drag to redact/i);
  });

  it('dragging over a zone draws an area exactly where the user dragged, in page space', () => {
    const onArea = vi.fn();
    const { getByTestId } = render(<UnreadableZones page={0} pageSize={PAGE} scale={1} zones={zones} onArea={onArea} />);
    const zone = getByTestId('unreadable-zone');
    fireEvent.pointerDown(zone, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(zone, { clientX: 20, clientY: 8, pointerId: 1 });
    fireEvent.pointerUp(zone, { clientX: 20, clientY: 8, pointerId: 1 });
    expect(onArea).toHaveBeenCalledWith({ page: 0, box: { x: 48, y: 98, width: 20, height: 8 } });
  });
});

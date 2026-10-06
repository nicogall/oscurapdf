import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Redaction, RedactionId } from '@app/views';
import { RedactionOverlays } from '../../../src/presentation/viewer/redaction-overlays';
import { renderWithServices } from '../../support/render-with-services';

const area = (page: number, x: number) => ({ page: page as never, box: { x, y: 10, width: 20, height: 10 } });

const item = (id: string, selected: boolean, occurrences: Redaction['occurrences']): Redaction => ({
  id: id as RedactionId,
  kind: 'text',
  text: 'x',
  key: 'x',
  occurrences,
  category: 'MANUAL',
  source: 'manual',
  confidence: 'userConfirmed',
  selected,
});

describe('RedactionOverlays', () => {
  const items = [
    item('a', true, [{ areas: [area(0, 0), area(1, 0)] }, { areas: [area(0, 50)] }]),
    item('b', false, [{ areas: [area(0, 100)] }]),
  ];

  it('draws a box for every occurrence of each selected redaction on the page, none for deselected', () => {
    const { getAllByTestId } = render(<RedactionOverlays page={0} scale={2} items={items} />);
    const boxes = getAllByTestId('redaction-overlay');
    expect(boxes).toHaveLength(2);
    expect(boxes.map((b) => b.style.left)).toEqual(['0px', '100px']);
    expect(boxes[0]?.style.width).toBe('40px');
  });

  it('highlights the focused occurrence', () => {
    const { getAllByTestId } = render(<RedactionOverlays page={0} scale={1} items={items} focused={{ id: 'a' as RedactionId, occurrence: 1 }} />);
    expect(getAllByTestId('redaction-overlay').map((b) => b.className)).toEqual(['overlay', 'overlay overlay--focused']);
  });

  it('hovering a box shows an X that removes its item; leaving hides it', async () => {
    const onRemove = vi.fn();
    await renderWithServices(<RedactionOverlays page={0} scale={1} items={items} onRemove={onRemove} />, {}, 'it');
    const [first] = screen.getAllByTestId('redaction-overlay');
    if (first === undefined) throw new Error('no box');
    expect(screen.queryByRole('button', { hidden: true })).toBeNull();
    fireEvent.pointerEnter(first);
    const remove = screen.getByRole('button', { hidden: true, name: 'Rimuovi «x» da tutti i 2 punti' });
    expect(first.className).toContain('overlay--hovered');
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledWith(items[0]);
    fireEvent.pointerLeave(first);
    expect(screen.queryByRole('button', { hidden: true })).toBeNull();
  });

  it('says that an automatic item stays among the suggestions', async () => {
    const automatic = { ...item('c', true, [{ areas: [area(0, 0)] }]), source: 'automatic' as const, confidence: 'high' as const, category: 'PERSON' as const, text: 'Rossi' };
    await renderWithServices(<RedactionOverlays page={0} scale={1} items={[automatic]} onRemove={vi.fn()} />, {}, 'it');
    fireEvent.pointerEnter(screen.getByTestId('redaction-overlay'));
    expect(screen.getByRole('button', { hidden: true }).getAttribute('title')).toBe('Non oscurare «Rossi» (rimane tra i suggerimenti)');
  });

  it('offers no X without a remove action (draw mode)', () => {
    const { getAllByTestId } = render(<RedactionOverlays page={0} scale={1} items={items} />);
    const [first] = getAllByTestId('redaction-overlay');
    if (first !== undefined) fireEvent.pointerEnter(first);
    expect(screen.queryByRole('button', { hidden: true })).toBeNull();
  });
});

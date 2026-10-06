import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { dragToBox } from '../../../src/presentation/viewer/area-drag';
import { AreaTool } from '../../../src/presentation/viewer/area-tool';
import { ToolSwitch } from '../../../src/presentation/viewer/tool-switch';
import { renderWithServices } from '../../support/render-with-services';

const PAGE = { width: 200, height: 300 };

describe('dragToBox', () => {
  it('converts a screen drag to a page-space box in either direction', () => {
    expect(dragToBox({ x: 20, y: 40 }, { x: 60, y: 100 }, 2, PAGE)).toEqual({ x: 10, y: 20, width: 20, height: 30 });
    expect(dragToBox({ x: 60, y: 100 }, { x: 20, y: 40 }, 2, PAGE)).toEqual({ x: 10, y: 20, width: 20, height: 30 });
  });

  it('ignores a drag shorter than 4 pt', () => {
    expect(dragToBox({ x: 10, y: 10 }, { x: 12, y: 12 }, 1, PAGE)).toBeUndefined();
  });

  it('keeps thin boxes at least 1 pt tall and clips to the page', () => {
    expect(dragToBox({ x: 10, y: 10 }, { x: 60, y: 10 }, 1, PAGE)).toEqual({ x: 10, y: 10, width: 50, height: 1 });
    expect(dragToBox({ x: 150, y: 250 }, { x: 260, y: 360 }, 1, PAGE)).toEqual({ x: 150, y: 250, width: 50, height: 50 });
  });
});

describe('ToolSwitch', () => {
  it('Select text is the default; switching reports the new mode', async () => {
    const onChange = vi.fn();
    await renderWithServices(<ToolSwitch mode="select" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Select text' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Select area' }).getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(screen.getByRole('button', { name: 'Select area' }));
    expect(onChange).toHaveBeenCalledWith('draw');
  });
});

describe('AreaTool', () => {
  const drag = (layer: Element, from: [number, number], to: [number, number]) => {
    fireEvent.pointerDown(layer, { clientX: from[0], clientY: from[1], pointerId: 1 });
    fireEvent.pointerMove(layer, { clientX: to[0], clientY: to[1], pointerId: 1 });
    fireEvent.pointerUp(layer, { clientX: to[0], clientY: to[1], pointerId: 1 });
  };

  it('creates an area in page space from a drag, with a live preview while dragging', () => {
    const onArea = vi.fn();
    const { getByTestId } = render(<AreaTool page={1} pageSize={PAGE} scale={2} onArea={onArea} />);
    const layer = getByTestId('area-tool');
    fireEvent.pointerDown(layer, { clientX: 20, clientY: 40, pointerId: 1 });
    fireEvent.pointerMove(layer, { clientX: 60, clientY: 100, pointerId: 1 });
    expect(getByTestId('area-preview').style.width).toBe('40px');
    fireEvent.pointerUp(layer, { clientX: 60, clientY: 100, pointerId: 1 });
    expect(onArea).toHaveBeenCalledWith({ page: 1, box: { x: 10, y: 20, width: 20, height: 30 } });
  });

  it('ignores a drag shorter than 4 pt', () => {
    const onArea = vi.fn();
    const { getByTestId } = render(<AreaTool page={0} pageSize={PAGE} scale={1} onArea={onArea} />);
    drag(getByTestId('area-tool'), [10, 10], [12, 12]);
    expect(onArea).not.toHaveBeenCalled();
  });

  it('Esc cancels a drag in progress', () => {
    const onArea = vi.fn();
    const { getByTestId, queryByTestId } = render(<AreaTool page={0} pageSize={PAGE} scale={1} onArea={onArea} />);
    const layer = getByTestId('area-tool');
    fireEvent.pointerDown(layer, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(layer, { clientX: 80, clientY: 80, pointerId: 1 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(queryByTestId('area-preview')).toBeNull();
    fireEvent.pointerUp(layer, { clientX: 80, clientY: 80, pointerId: 1 });
    expect(onArea).not.toHaveBeenCalled();
  });

  it('ignores moves and releases without a press', () => {
    const onArea = vi.fn();
    const { getByTestId } = render(<AreaTool page={0} pageSize={PAGE} scale={1} onArea={onArea} />);
    const layer = getByTestId('area-tool');
    fireEvent.pointerMove(layer, { clientX: 80, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(layer, { clientX: 80, clientY: 80, pointerId: 1 });
    expect(onArea).not.toHaveBeenCalled();
  });
});

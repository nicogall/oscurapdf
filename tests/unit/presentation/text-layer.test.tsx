import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TextSpan } from '@app/views';
import { TextLayer } from '../../../src/presentation/viewer/text-layer';

const box = (x: number, y: number) => ({ x, y, width: 5, height: 10 });

const spans: TextSpan[] = [
  { page: 0 as never, range: { start: 0, end: 5 }, line: 0, charBoxes: [0, 1, 2, 3, 4].map((i) => box(10 + i * 5, 20)) },
  { page: 0 as never, range: { start: 6, end: 9 }, line: 1, charBoxes: [0, 1, 2].map((i) => box(10 + i * 5, 40)) },
];

describe('TextLayer', () => {
  it('renders one text node per span carrying its document offset', () => {
    const { container } = render(<TextLayer text={'Hello\nABC'} spans={spans} scale={2} />);
    const nodes = [...container.querySelectorAll<HTMLElement>('[data-char-start]')];
    expect(nodes.map((n) => n.textContent)).toEqual(['Hello', 'ABC']);
    expect(nodes.map((n) => n.dataset.charStart)).toEqual(['0', '6']);
  });

  it('positions each span at its scaled box', () => {
    const { container } = render(<TextLayer text={'Hello\nABC'} spans={spans} scale={2} />);
    const first = container.querySelector<HTMLElement>('[data-char-start="0"]');
    expect(first?.style.left).toBe('20px');
    expect(first?.style.top).toBe('40px');
    expect(first?.style.height).toBe('20px');
  });
});

describe('TextLayer width fitting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stretches each span to the width of its glyph boxes', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(25);
    const { container } = render(<TextLayer text={'Hello\nABC'} spans={spans} scale={2} />);
    const first = container.querySelector<HTMLElement>('[data-char-start="0"]');
    expect(first?.style.transform).toBe('scaleX(2)');
  });

  it('renders nothing for a span without boxes', () => {
    const empty = [{ ...spans[0], charBoxes: [] } as unknown as TextSpan];
    const { container } = render(<TextLayer text="Hello" spans={empty} scale={1} />);
    expect(container.querySelector('[data-char-start]')).toBeNull();
  });
});

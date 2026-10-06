import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVisibility } from '../../../src/presentation/viewer/use-visibility';

const Probe = () => {
  const [ref, visible] = useVisibility<HTMLDivElement>();
  return <div ref={ref}>{visible ? 'visible' : 'hidden'}</div>;
};

class FakeObserver {
  static instances: FakeObserver[] = [];
  disconnected = false;
  constructor(readonly callback: IntersectionObserverCallback) {
    FakeObserver.instances.push(this);
  }
  observe(): void {}
  disconnect(): void {
    this.disconnected = true;
  }
  fire(isIntersecting: boolean): void {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeObserver.instances = [];
});

describe('useVisibility', () => {
  it('is visible immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    expect(render(<Probe />).container.textContent).toBe('visible');
  });

  it('becomes visible only when the element intersects, and disconnects on unmount', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { container, unmount } = render(<Probe />);
    const observer = FakeObserver.instances[0];
    expect(container.textContent).toBe('hidden');
    act(() => observer?.fire(false));
    expect(container.textContent).toBe('hidden');
    act(() => observer?.fire(true));
    expect(container.textContent).toBe('visible');
    unmount();
    expect(observer?.disconnected).toBe(true);
  });
});

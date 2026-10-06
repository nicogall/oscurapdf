import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

const contentWidth = (element: HTMLElement): number => {
  const style = getComputedStyle(element);
  return element.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
};

/** The width an element leaves to its content, kept current when the window is resized or the phone is turned. */
export const useContentWidth = <T extends HTMLElement>(): [RefObject<T | null>, number | undefined] => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;
    const measure = (): void => {
      setWidth(contentWidth(element));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width];
};

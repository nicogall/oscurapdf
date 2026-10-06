import { useEffect, useRef, useState, type RefObject } from 'react';

/** True once the element is near the viewport. Without IntersectionObserver, always true. */
export const useVisibility = <T extends Element>(): [RefObject<T | null>, boolean] => {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: '400px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, visible];
};

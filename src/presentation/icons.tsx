import type { ReactElement } from 'react';

/** Small inline SVG icons (no external assets: CSP and offline use). Decorative: hidden from AT. */
const paths = {
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  upload: 'M12 16V4m0 0-5 5m5-5 5 5M4 16v4h16v-4',
  file: 'M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  check: 'M5 12l5 5L20 7',
  cross: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'm15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
} as const;

export type IconName = keyof typeof paths;

export const Icon = ({ name, className = 'icon' }: { readonly name: IconName; readonly className?: string }): ReactElement => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={paths[name]} />
  </svg>
);

/** Brand mark: a page whose middle line is blacked out. */
export const BrandMark = (): ReactElement => (
  <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <rect x="5" y="3" width="22" height="26" rx="4" fill="currentColor" opacity="0.14" />
    <rect x="9" y="9" width="14" height="2.5" rx="1.25" fill="currentColor" opacity="0.45" />
    <rect x="9" y="14.5" width="14" height="4" rx="1" fill="currentColor" />
    <rect x="9" y="21.5" width="9" height="2.5" rx="1.25" fill="currentColor" opacity="0.45" />
  </svg>
);

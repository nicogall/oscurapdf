import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { CharRange } from '@shared-kernel';
import { rangeToCharRange } from './selection-mapper';

interface PendingSelection {
  readonly range: CharRange;
  readonly left: number;
  readonly top: number;
}

const currentSelection = (container: HTMLElement): PendingSelection | undefined => {
  const selection = document.getSelection();
  if (selection === null || selection.rangeCount === 0) return undefined;
  const domRange = selection.getRangeAt(0);
  if (!container.contains(domRange.commonAncestorContainer)) return undefined;
  const range = rangeToCharRange(domRange);
  if (range === undefined) return undefined;
  const box = domRange.getBoundingClientRect();
  const origin = container.getBoundingClientRect();
  return { range, left: box.right - origin.left + container.scrollLeft, top: box.bottom - origin.top + container.scrollTop };
};

interface SelectionToRedactProps {
  readonly onRedact: (range: CharRange) => void;
  readonly children: ReactNode;
}

/** Shows a contextual "Redact" button next to any non-empty text selection (FR-012). */
export const SelectionToRedact = ({ onRedact, children }: SelectionToRedactProps): ReactElement => {
  const { t } = useTranslation();
  const container = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingSelection | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      if (container.current !== null) setPending(currentSelection(container.current));
    };
    document.addEventListener('selectionchange', update);
    return () => {
      document.removeEventListener('selectionchange', update);
    };
  }, []);

  const redact = () => {
    if (pending === undefined) return;
    onRedact(pending.range);
    document.getSelection()?.removeAllRanges();
    setPending(undefined);
  };

  return (
    <div ref={container} className="selection-container">
      {children}
      {pending !== undefined && (
        <button
          type="button"
          className="primary redact-button"
          style={{ left: `${pending.left}px`, top: `${pending.top}px` }}
          // Keep the text selection alive: mousedown would otherwise clear it before the click.
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={redact}
        >
          {t('viewer.redact')}
        </button>
      )}
    </div>
  );
};

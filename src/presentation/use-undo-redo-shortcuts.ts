import { useEffect } from 'react';

export type HistoryCommand = 'undo' | 'redo';

export interface UndoRedo {
  undo(): boolean;
  redo(): boolean;
}

type KeyInfo = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>;

/**
 * Cmd+Z (macOS) or Ctrl+Z (Windows, Linux) undoes; Cmd+Shift+Z / Ctrl+Shift+Z or Ctrl+Y redoes.
 * Uses `key`, not the physical key, so it follows the user's keyboard layout.
 */
export const historyCommandFor = (event: KeyInfo): HistoryCommand | undefined => {
  if (event.altKey || !(event.metaKey || event.ctrlKey)) return undefined;
  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey) return 'redo';
  return undefined;
};

const TYPING_INPUTS = new Set(['text', 'search', 'email', 'number', 'password', 'tel', 'url']);

/** Text fields keep their own native undo. */
const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && TYPING_INPUTS.has(target.type)));

/** Global undo / redo keys for the review, active only while `enabled`. */
export const useUndoRedoShortcuts = (history: UndoRedo, enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event: KeyboardEvent) => {
      const command = historyCommandFor(event);
      if (command === undefined || isTyping(event.target)) return;
      event.preventDefault();
      history[command]();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [history, enabled]);
};

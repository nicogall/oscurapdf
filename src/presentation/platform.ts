/** Apple keyboards use Cmd (⌘) where Windows and Linux use Ctrl. */
export const isApplePlatform = (nav: Pick<Navigator, 'platform' | 'userAgent'> = navigator): boolean =>
  /Mac|iPhone|iPad|iPod/i.test(nav.platform || nav.userAgent);

export interface ShortcutLabels {
  readonly undo: string;
  readonly redo: string;
}

export const shortcutLabels = (apple: boolean): ShortcutLabels =>
  apple ? { undo: '⌘Z', redo: '⇧⌘Z' } : { undo: 'Ctrl+Z', redo: 'Ctrl+Y' };

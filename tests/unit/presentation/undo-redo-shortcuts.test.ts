import { describe, expect, it } from 'vitest';
import { isApplePlatform, shortcutLabels } from '../../../src/presentation/platform';
import { historyCommandFor } from '../../../src/presentation/use-undo-redo-shortcuts';

const key = (k: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey', boolean>> = {}) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe('undo / redo key mapping (macOS and Windows)', () => {
  it('maps the standard shortcuts of both platforms', () => {
    expect(historyCommandFor(key('z', { metaKey: true }))).toBe('undo');
    expect(historyCommandFor(key('Z', { metaKey: true, shiftKey: true }))).toBe('redo');
    expect(historyCommandFor(key('z', { ctrlKey: true }))).toBe('undo');
    expect(historyCommandFor(key('Z', { ctrlKey: true, shiftKey: true }))).toBe('redo');
    expect(historyCommandFor(key('y', { ctrlKey: true }))).toBe('redo');
  });

  it('ignores plain keys, Alt combinations and unrelated shortcuts', () => {
    expect(historyCommandFor(key('z'))).toBeUndefined();
    expect(historyCommandFor(key('z', { ctrlKey: true, altKey: true }))).toBeUndefined();
    expect(historyCommandFor(key('y', { metaKey: true }))).toBeUndefined();
    expect(historyCommandFor(key('c', { ctrlKey: true }))).toBeUndefined();
  });

  it('shows ⌘ shortcuts on Apple devices and Ctrl elsewhere', () => {
    expect(isApplePlatform({ platform: 'MacIntel', userAgent: '' })).toBe(true);
    expect(isApplePlatform({ platform: '', userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)' })).toBe(true);
    expect(isApplePlatform({ platform: 'Win32', userAgent: 'Windows NT 10.0' })).toBe(false);
    expect(shortcutLabels(true)).toEqual({ undo: '⌘Z', redo: '⇧⌘Z' });
    expect(shortcutLabels(false)).toEqual({ undo: 'Ctrl+Z', redo: 'Ctrl+Y' });
  });
});

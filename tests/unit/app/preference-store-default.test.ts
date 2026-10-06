// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { LocalStoragePreferenceStore } from '@app/infrastructure/local-storage-preference-store';

describe('LocalStoragePreferenceStore default storage', () => {
  it('uses window.localStorage by default', () => {
    new LocalStoragePreferenceStore().writeLanguage('it');
    expect(window.localStorage.getItem('redactor.language')).toBe('it');
  });
});

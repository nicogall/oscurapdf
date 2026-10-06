import { describe, expect, it } from 'vitest';
import { LocalStoragePreferenceStore } from '@app/infrastructure/local-storage-preference-store';

const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => data.delete(k),
    setItem: (k, v) => data.set(k, v),
  };
};

const throwingStorage = (): Storage => {
  const fail = () => {
    throw new Error('blocked');
  };
  return { length: 0, clear: fail, getItem: fail, key: fail, removeItem: fail, setItem: fail };
};

describe('LocalStoragePreferenceStore', () => {
  it('stores and reads back the language only', () => {
    const storage = memoryStorage();
    const store = new LocalStoragePreferenceStore(() => storage);
    expect(store.readLanguage()).toBeUndefined();
    store.writeLanguage('it');
    expect(store.readLanguage()).toBe('it');
    expect(storage.length).toBe(1);
  });

  it('ignores unknown stored values', () => {
    const storage = memoryStorage();
    storage.setItem('redactor.language', 'fr');
    expect(new LocalStoragePreferenceStore(() => storage).readLanguage()).toBeUndefined();
  });

  it('survives a throwing or missing localStorage (falls back to memory)', () => {
    const store = new LocalStoragePreferenceStore(throwingStorage);
    store.writeLanguage('en');
    expect(store.readLanguage()).toBe('en');
    const missing = new LocalStoragePreferenceStore(() => {
      throw new Error('no storage');
    });
    missing.writeLanguage('it');
    expect(missing.readLanguage()).toBe('it');
  });
});

import { LANGUAGES, type Language, type PreferenceStore } from '../ports/preference-store';

const KEY = 'redactor.language';

const isLanguage = (value: string | null): value is Language => LANGUAGES.includes(value as Language);

/**
 * Stores the language in localStorage. Every access is wrapped in try/catch (private windows,
 * blocked site data) and falls back to memory, so the app works without storage.
 */
export class LocalStoragePreferenceStore implements PreferenceStore {
  private memory: Language | undefined;

  constructor(private readonly storage: () => Storage = () => window.localStorage) {}

  readLanguage(): Language | undefined {
    try {
      const stored = this.storage().getItem(KEY);
      return isLanguage(stored) ? stored : this.memory;
    } catch {
      return this.memory;
    }
  }

  writeLanguage(language: Language): void {
    this.memory = language;
    try {
      this.storage().setItem(KEY, language);
    } catch {
      // Storage unavailable: the in-memory value is used for this session.
    }
  }
}

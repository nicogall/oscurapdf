/** The only data stored on the device: the UI language (FR-033). */
export type Language = 'en' | 'it';

export const LANGUAGES: readonly Language[] = ['en', 'it'];

export interface PreferenceStore {
  readLanguage(): Language | undefined;
  writeLanguage(language: Language): void;
}

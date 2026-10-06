import i18next, { type i18n } from 'i18next';
import type { Language } from '@app/views';
import { en } from './en';
import { it } from './it';

/** Italian browsers get Italian; every other language gets English (FR-033). */
export const detectDefaultLanguage = (browserLanguages: readonly string[]): Language =>
  browserLanguages[0]?.toLowerCase().startsWith('it') === true ? 'it' : 'en';

export const initialLanguage = (stored: Language | undefined, browserLanguages: readonly string[]): Language =>
  stored ?? detectDefaultLanguage(browserLanguages);

/**
 * Languages offered in the UI. Italian only for now (decision 2026-10-01): the English copy and
 * the switch are kept, and come back by adding 'en' here.
 */
export const UI_LANGUAGES: readonly Language[] = ['it'];

/** With a single offered language the UI is fixed to it; otherwise preference → browser (FR-033). */
export const startLanguage = (offered: readonly Language[], stored: Language | undefined, browserLanguages: readonly string[]): Language => {
  const [only] = offered;
  if (offered.length === 1 && only !== undefined) return only;
  const preferred = initialLanguage(stored, browserLanguages);
  return offered.includes(preferred) ? preferred : (only ?? preferred);
};

export const createI18n = async (language: Language): Promise<i18n> => {
  const instance = i18next.createInstance();
  await instance.init({
    lng: language,
    fallbackLng: 'en',
    resources: { en: { translation: en }, it: { translation: it } },
    interpolation: { escapeValue: false },
  });
  return instance;
};

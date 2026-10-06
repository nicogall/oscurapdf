import { useId, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@app/views';
import { useServices } from '../app-context';
import { UI_LANGUAGES } from './i18n';

/** Shown only when more than one language is offered (UI_LANGUAGES); switching never resets the document or its redactions (FR-033). */
export const LanguageSwitch = ({ languages = UI_LANGUAGES }: { readonly languages?: readonly Language[] }): ReactElement => {
  const { t, i18n } = useTranslation();
  const { preferences } = useServices();
  const id = useId();
  const change = (language: Language) => {
    preferences.writeLanguage(language);
    void i18n.changeLanguage(language);
  };
  return (
    <div className="language-switch">
      <label htmlFor={id}>{t('language.label')}</label>
      <select
        id={id}
        value={i18n.language}
        onChange={(event) => {
          change(event.target.value as Language);
        }}
      >
        {languages.map((language) => (
          <option key={language} value={language}>
            {t(`language.${language}`)}
          </option>
        ))}
      </select>
    </div>
  );
};

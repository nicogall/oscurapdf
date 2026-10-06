import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import type { AppServices } from '@app/views';
import { ServicesContext } from '../../src/presentation/app-context';
import { createI18n } from '../../src/presentation/i18n/i18n';

/** Renders a component with real i18n (EN by default) and the given app services. */
export const renderWithServices = async (
  element: ReactElement,
  services: Partial<AppServices> = {},
  language: 'en' | 'it' = 'en',
): Promise<RenderResult> => {
  const i18n = await createI18n(language);
  return render(
    <I18nextProvider i18n={i18n}>
      <ServicesContext.Provider value={services as AppServices}>{element}</ServicesContext.Provider>
    </I18nextProvider>,
  );
};

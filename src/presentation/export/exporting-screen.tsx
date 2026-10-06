import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** Progress while redacting and verifying; the review list is read-only meanwhile. */
export const ExportingScreen = ({ fraction }: { fraction?: number | undefined }): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="export-screen" aria-live="polite">
      <h2>{t('exporting.title')}</h2>
      <progress aria-label={t('exporting.title')} {...(fraction === undefined ? {} : { value: fraction, max: 1 })} />
    </section>
  );
};

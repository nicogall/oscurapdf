import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** The writer failed: nothing was produced or saved. */
export const ExportFailedScreen = ({ onBack }: { onBack: () => void }): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="export-screen export-screen--failed" role="alert">
      <h2>{t('exportFailed.title')}</h2>
      <p>{t('exportFailed.body')}</p>
      <button type="button" className="primary" onClick={onBack} autoFocus>
        {t('exportFailed.back')}
      </button>
    </section>
  );
};

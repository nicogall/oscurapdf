import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** FR-005 / SC-008: never implies the document was checked for PII. */
export const ImageOnlyScreen = ({ onBack }: { onBack: () => void }): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="export-screen">
      <p role="alert">{t('imageOnly.message')}</p>
      <button type="button" className="primary" onClick={onBack} autoFocus>
        {t('imageOnly.back')}
      </button>
    </section>
  );
};

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerificationReport } from '@app/views';
import { CheckList } from './check-list';

interface VerificationFailedScreenProps {
  readonly report: VerificationReport;
  readonly onBack: () => void;
  readonly onSaveAnyway: () => void;
}

/** FR-026: never "complete" or "safe". Back to review is the default action. */
export const VerificationFailedScreen = ({ report, onBack, onSaveAnyway }: VerificationFailedScreenProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="export-screen export-screen--failed" role="alert">
      <h2>⚠ {t('failed.title')}</h2>
      <p>{t('failed.body')}</p>
      <h3>{t('failed.failedChecks')}</h3>
      <CheckList checks={report.checks.filter((check) => !check.passed)} />
      <div className="export-screen__actions">
        <button type="button" className="primary" onClick={onBack} autoFocus>
          {t('failed.back')}
        </button>
        <button type="button" className="danger" onClick={onSaveAnyway}>
          {t('failed.saveAnyway')}
        </button>
      </div>
    </section>
  );
};

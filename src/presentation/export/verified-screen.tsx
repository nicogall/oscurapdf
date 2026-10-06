import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerificationReport } from '@app/views';
import { CheckList } from './check-list';

interface VerifiedScreenProps {
  readonly report: VerificationReport;
  readonly onSave: () => void;
  readonly onBack: () => void;
}

/** Shown only when the outcome is verified (FR-026): the only screen that says "complete". */
export const VerifiedScreen = ({ report, onSave, onBack }: VerifiedScreenProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="export-screen export-screen--verified">
      <h2>{t('verified.title')}</h2>
      <p>{t('verified.itemsRemoved', { count: report.itemsRemoved })}</p>
      <p>{t('verified.summary')}</p>
      {/* One line is enough when everything passed; the checks stay available (FR-026). */}
      <details className="check-details">
        <summary>{t('verified.details', { count: report.checks.length })}</summary>
        <CheckList checks={report.checks} />
      </details>
      <div className="export-screen__actions">
        <button type="button" className="primary" onClick={onSave} autoFocus>
          {t('verified.save')}
        </button>
        <button type="button" onClick={onBack}>
          {t('verified.back')}
        </button>
      </div>
    </section>
  );
};

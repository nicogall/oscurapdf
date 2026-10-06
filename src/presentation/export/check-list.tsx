import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerificationCheck } from '@app/views';

const failedPages = (check: VerificationCheck): string =>
  [...new Set(check.failures.flatMap((f) => (f.page === undefined ? [] : [f.page + 1])))].join(', ');

/** Each check with ✓ or ✗ and, for failures, the page numbers only (never document text). */
export const CheckList = ({ checks }: { checks: readonly VerificationCheck[] }): ReactElement => {
  const { t } = useTranslation();
  return (
    <ul className="check-list">
      {checks.map((check) => {
        const pages = failedPages(check);
        return (
          <li key={check.kind} className={check.passed ? 'check--passed' : 'check--failed'}>
            <span aria-hidden="true">{check.passed ? '✓' : '✗'}</span> {t(`checks.${check.kind}`)}
            {!check.passed && pages !== '' && <span className="check__pages"> ({t('failed.pages', { pages })})</span>}
          </li>
        );
      })}
    </ul>
  );
};

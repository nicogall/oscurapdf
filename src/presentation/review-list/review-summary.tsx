import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReviewSummary as Summary } from '@app/views';

/** "N potential sensitive items — A detected automatically, M manually selected" (FR-017). */
export const ReviewSummary = ({ summary }: { summary: Summary }): ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="review-summary" aria-live="polite">
      <p className="review-summary__total">{t('review.summary', { count: summary.total })}</p>
      <p>{t('review.automatic', { count: summary.automatic })}</p>
      <p>{t('review.manual', { count: summary.manual })}</p>
    </div>
  );
};

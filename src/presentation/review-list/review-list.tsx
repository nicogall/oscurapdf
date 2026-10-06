import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReviewSnapshot } from '@app/views';
import { BulkActions } from './bulk-actions';
import type { RedactionItemActions } from './redaction-item';
import { ReviewSummary } from './review-summary';
import { SourceGroups } from './source-groups';

interface ReviewListProps {
  readonly snapshot: ReviewSnapshot;
  readonly actions: RedactionItemActions & { onSelectAll: () => void; onDeselectAll: () => void };
}

/** Summary, bulk actions and every redaction in one list (FR-016, FR-017, FR-018). */
export const ReviewList = ({ snapshot, actions }: ReviewListProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="review-list" aria-label={t('review.listLabel')}>
      <ReviewSummary summary={snapshot.summary} />
      <BulkActions onSelectAll={actions.onSelectAll} onDeselectAll={actions.onDeselectAll} />
      <p className="hint">{t('detection.reminder')}</p>
      {snapshot.items.length === 0 ? (
        <p className="review-list__empty">{t('review.empty')}</p>
      ) : (
        <SourceGroups items={snapshot.items} actions={actions} />
      )}
    </section>
  );
};

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface BulkActionsProps {
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
}

export const BulkActions = ({ onSelectAll, onDeselectAll }: BulkActionsProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="bulk-actions">
      <button type="button" onClick={onSelectAll}>
        {t('review.selectAll')}
      </button>
      <button type="button" onClick={onDeselectAll}>
        {t('review.deselectAll')}
      </button>
    </div>
  );
};

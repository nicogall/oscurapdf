import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { Redaction } from '@app/views';

/** Localized category, or MANUAL for user-added items. */
export const CategoryBadge = ({ category }: { category: Redaction['category'] }): ReactElement => {
  const { t } = useTranslation();
  return <span className="badge">{category === 'MANUAL' ? t('review.manualBadge') : t(`categories.${category}`)}</span>;
};

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConfidenceLevel } from '@app/views';

/** High / Medium, or "Suggestion" for low-confidence items (FR-009, ui-contract). */
export const ConfidenceBadge = ({ confidence }: { confidence: ConfidenceLevel }): ReactElement => {
  const { t } = useTranslation();
  return <span className={`badge badge--confidence badge--${confidence}`}>{t(`confidence.${confidence}`)}</span>;
};

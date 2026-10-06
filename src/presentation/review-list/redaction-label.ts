import type { TFunction } from 'i18next';
import type { Redaction } from '@app/views';

const MAX_LABEL = 60;

/** The text (truncated), or "Area, page N" for area redactions. */
export const redactionLabel = (item: Redaction, t: TFunction): string => {
  if (item.kind === 'area') return t('review.area', { page: (item.occurrences[0]?.areas[0]?.page ?? 0) + 1 });
  const text = item.text ?? '';
  return text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text;
};

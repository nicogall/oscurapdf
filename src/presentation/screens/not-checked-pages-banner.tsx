import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

const pageList = (pages: readonly number[]): string => pages.map((page) => page + 1).join(', ');

interface NotCheckedPagesBannerProps {
  /** Pages without text (FR-005). */
  readonly pages: readonly number[];
  /** Pages with text that cannot be read (FR-037). */
  readonly unreadablePages?: readonly number[];
}

/** Pages that were not (or not completely) checked automatically: never presented as checked. */
export const NotCheckedPagesBanner = ({ pages, unreadablePages = [] }: NotCheckedPagesBannerProps): ReactElement | null => {
  const { t } = useTranslation();
  if (pages.length === 0 && unreadablePages.length === 0) return null;
  return (
    <>
      {pages.length > 0 && (
        <p className="detection-status detection-status--degraded" role="status">
          ⚠ {t('notChecked.banner', { pages: pageList(pages) })}
        </p>
      )}
      {unreadablePages.length > 0 && (
        <p className="detection-status detection-status--degraded" role="status">
          ⚠ {t('notChecked.unreadable', { pages: pageList(unreadablePages) })}
        </p>
      )}
    </>
  );
};

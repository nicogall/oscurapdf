import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Page, TextModelView } from '@app/views';
import { fitScale } from './fit-scale';
import { PageCanvas } from './page-canvas';
import { TextLayer } from './text-layer';
import { useContentWidth } from './use-content-width';
import { useVisibility } from './use-visibility';

export { VIEWER_SCALE } from './fit-scale';

interface ViewerPageProps {
  readonly page: Page;
  readonly textModel: TextModelView;
  readonly scale: number;
  readonly overlay?: (page: Page, scale: number) => ReactNode;
}

const ViewerPage = ({ page, textModel, scale, overlay }: ViewerPageProps): ReactElement => {
  const { t } = useTranslation();
  const [ref, visible] = useVisibility<HTMLDivElement>();
  const spans = textModel.spans.filter((span) => span.page === page.index);
  return (
    <div
      ref={ref}
      className="page"
      data-page-index={page.index}
      aria-label={t('viewer.page', { number: page.index + 1 })}
      style={{ width: `${page.size.width * scale}px`, height: `${page.size.height * scale}px` }}
    >
      <PageCanvas page={page} scale={scale} visible={visible} />
      <TextLayer text={textModel.text} spans={spans} scale={scale} />
      {overlay?.(page, scale)}
    </div>
  );
};

interface DocumentViewerProps {
  readonly pages: readonly Page[];
  readonly textModel: TextModelView;
  readonly overlay?: (page: Page, scale: number) => ReactNode;
}

/**
 * All pages stacked vertically; each page renders its canvas lazily when near the viewport, at a
 * scale that fits the width available (smaller on a phone, so the page is never cut off).
 */
export const DocumentViewer = ({ pages, textModel, overlay }: DocumentViewerProps): ReactElement => {
  const [ref, width] = useContentWidth<HTMLDivElement>();
  return (
    <div ref={ref} className="viewer">
      {pages.map((page) => (
        <ViewerPage key={page.index} page={page} textModel={textModel} scale={fitScale(width, page.size.width)} {...(overlay ? { overlay } : {})} />
      ))}
    </div>
  );
};

import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Page, TextModelView } from '@app/views';
import { PageCanvas } from './page-canvas';
import { TextLayer } from './text-layer';
import { useVisibility } from './use-visibility';

export const VIEWER_SCALE = 1.25;

interface ViewerPageProps {
  readonly page: Page;
  readonly textModel: TextModelView;
  readonly overlay?: (page: Page, scale: number) => ReactNode;
}

const ViewerPage = ({ page, textModel, overlay }: ViewerPageProps): ReactElement => {
  const { t } = useTranslation();
  const [ref, visible] = useVisibility<HTMLDivElement>();
  const spans = textModel.spans.filter((span) => span.page === page.index);
  return (
    <div
      ref={ref}
      className="page"
      data-page-index={page.index}
      aria-label={t('viewer.page', { number: page.index + 1 })}
      style={{ width: `${page.size.width * VIEWER_SCALE}px`, height: `${page.size.height * VIEWER_SCALE}px` }}
    >
      <PageCanvas page={page} scale={VIEWER_SCALE} visible={visible} />
      <TextLayer text={textModel.text} spans={spans} scale={VIEWER_SCALE} />
      {overlay?.(page, VIEWER_SCALE)}
    </div>
  );
};

interface DocumentViewerProps {
  readonly pages: readonly Page[];
  readonly textModel: TextModelView;
  readonly overlay?: (page: Page, scale: number) => ReactNode;
}

/** All pages stacked vertically; each page renders its canvas lazily when near the viewport. */
export const DocumentViewer = ({ pages, textModel, overlay }: DocumentViewerProps): ReactElement => (
  <div className="viewer">
    {pages.map((page) => (
      <ViewerPage key={page.index} page={page} textModel={textModel} {...(overlay ? { overlay } : {})} />
    ))}
  </div>
);

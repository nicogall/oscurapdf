import { useEffect, useRef, type ReactElement } from 'react';
import type { Page } from '@app/views';
import { useServices } from '../app-context';

interface PageCanvasProps {
  readonly page: Page;
  readonly scale: number;
  readonly visible: boolean;
}

/** Draws the page bitmap rendered by the document worker. Renders only when visible. */
export const PageCanvas = ({ page, scale, visible }: PageCanvasProps): ReactElement => {
  const { renderPage } = useServices();
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const pixelRatio = globalThis.devicePixelRatio || 1;
    void renderPage(page.index, scale * pixelRatio).then((result) => {
      const element = canvas.current;
      if (cancelled || !result.ok || element === null) return;
      element.width = result.value.width;
      element.height = result.value.height;
      element.getContext('2d')?.drawImage(result.value.image, 0, 0);
      result.value.image.close();
    });
    return () => {
      cancelled = true;
    };
  }, [page.index, scale, visible, renderPage]);

  return (
    <canvas
      ref={canvas}
      className="page__canvas"
      style={{ width: `${page.size.width * scale}px`, height: `${page.size.height * scale}px` }}
      aria-hidden="true"
    />
  );
};

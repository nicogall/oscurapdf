import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { PageArea } from '@shared-kernel';
import { AreaTool, type DrawnArea } from './area-tool';
import type { PageSize } from './area-drag';
import { pageToScreen } from './page-geometry';

/** Points of margin around a zone, so the drag can start just before the text. */
const MARGIN = 2;

interface UnreadableZonesProps {
  readonly page: number;
  readonly pageSize: PageSize;
  readonly scale: number;
  readonly zones: readonly PageArea[];
  readonly onArea: (area: DrawnArea) => void;
}

/**
 * Text that cannot be read (FR-037) is outlined and not selectable as text: dragging over it
 * draws an area redaction exactly where the user dragged.
 */
export const UnreadableZones = ({ page, pageSize, scale, zones, onArea }: UnreadableZonesProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <>
      {zones
        .filter((zone) => zone.page === page)
        .map(({ box }) => (
          <AreaTool
            key={`${String(box.x)}:${String(box.y)}`}
            page={page}
            pageSize={pageSize}
            scale={scale}
            onArea={onArea}
            frame={pageToScreen({ x: box.x - MARGIN, y: box.y - MARGIN, width: box.width + 2 * MARGIN, height: box.height + 2 * MARGIN }, scale)}
            className="unreadable-zone"
            title={t('notChecked.zone')}
          />
        ))}
    </>
  );
};

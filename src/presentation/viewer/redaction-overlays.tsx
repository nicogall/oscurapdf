import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { Redaction, RedactionId } from '@app/views';
import { Icon } from '../icons';
import { redactionLabel } from '../review-list/redaction-label';
import { pageToScreen } from './page-geometry';

export interface FocusedOccurrence {
  readonly id: RedactionId;
  readonly occurrence: number;
}

interface RedactionOverlaysProps {
  readonly page: number;
  readonly scale: number;
  readonly items: readonly Redaction[];
  readonly focused?: FocusedOccurrence | undefined;
  /** When given, hovering a box shows an X that takes its item out of the redaction. */
  readonly onRemove?: ((item: Redaction) => void) | undefined;
}

const isFocused = (focused: FocusedOccurrence | undefined, id: RedactionId, occurrence: number): boolean =>
  focused !== undefined && focused.id === id && focused.occurrence === occurrence;

/** The X on a hovered box: deselects an automatic item (it stays in the list), deletes a manual one. */
const RemoveButton = ({ item, onRemove }: { readonly item: Redaction; readonly onRemove: (item: Redaction) => void }): ReactElement => {
  const { t } = useTranslation();
  const label = redactionLabel(item, t);
  const count = item.occurrences.length;
  const text = item.source === 'manual' ? t('viewer.removeManual', { label, count }) : t('viewer.removeAutomatic', { label, count });
  return (
    // Pointer only: keyboard users get the same actions in the review list.
    <button type="button" className="overlay__remove" tabIndex={-1} title={text} aria-label={text} onClick={() => { onRemove(item); }}>
      <Icon name="cross" className="icon icon--xs" />
    </button>
  );
};

interface Box {
  readonly key: string;
  readonly item: Redaction;
  readonly occurrence: number;
  readonly rect: ReturnType<typeof pageToScreen>;
}

const boxesOnPage = (items: readonly Redaction[], page: number, scale: number): Box[] =>
  items
    .filter((item) => item.selected)
    .flatMap((item) =>
      item.occurrences.flatMap((occurrence, index) =>
        occurrence.areas
          .filter((area) => area.page === page)
          .map((area, areaIndex) => ({ key: `${item.id}-${String(index)}-${String(areaIndex)}`, item, occurrence: index, rect: pageToScreen(area.box, scale) })),
      ),
    );

/** A box for every area of every occurrence of each selected redaction on this page (FR-020). */
export const RedactionOverlays = ({ page, scale, items, focused, onRemove }: RedactionOverlaysProps): ReactElement => {
  const [hovered, setHovered] = useState<string | undefined>(undefined);
  return (
    <div className={`overlays${onRemove ? ' overlays--interactive' : ''}`} aria-hidden="true">
      {boxesOnPage(items, page, scale).map(({ key, item, occurrence, rect }) => (
        <div
          key={key}
          className={`overlay${isFocused(focused, item.id, occurrence) ? ' overlay--focused' : ''}${hovered === key ? ' overlay--hovered' : ''}`}
          data-testid="redaction-overlay"
          style={{ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }}
          onPointerEnter={() => { setHovered(key); }}
          onPointerLeave={() => { setHovered((current) => (current === key ? undefined : current)); }}
        >
          {onRemove && hovered === key && <RemoveButton item={item} onRemove={onRemove} />}
        </div>
      ))}
    </div>
  );
};

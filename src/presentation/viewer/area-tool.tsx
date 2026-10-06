import { useEffect, useState, type PointerEvent, type ReactElement } from 'react';
import type { BoundingBox } from '@shared-kernel';
import { dragToBox, type PageSize } from './area-drag';
import type { Point } from './page-geometry';

export interface DrawnArea {
  readonly page: number;
  readonly box: BoundingBox;
}

/** A part of the page (screen pixels) the tool is limited to; the whole page when absent. */
export interface ToolFrame {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface AreaToolProps {
  readonly page: number;
  readonly pageSize: PageSize;
  readonly scale: number;
  readonly onArea: (area: DrawnArea) => void;
  readonly frame?: ToolFrame;
  readonly className?: string;
  readonly title?: string;
}

const relativePoint = (event: PointerEvent<HTMLDivElement>): Point => {
  const origin = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - origin.left, y: event.clientY - origin.top };
};

const previewStyle = (start: Point, end: Point) => ({
  left: `${Math.min(start.x, end.x)}px`,
  top: `${Math.min(start.y, end.y)}px`,
  width: `${Math.abs(end.x - start.x)}px`,
  height: `${Math.abs(end.y - start.y)}px`,
});

/** Drag to draw a rectangle redaction on this page; Esc cancels (FR-014, ui-contract). */
const onPage = (point: Point, frame: ToolFrame | undefined): Point =>
  frame === undefined ? point : { x: point.x + frame.left, y: point.y + frame.top };

const frameStyle = (frame: ToolFrame | undefined) =>
  frame === undefined ? undefined : { left: `${frame.left}px`, top: `${frame.top}px`, width: `${frame.width}px`, height: `${frame.height}px` };

export const AreaTool = ({ page, pageSize, scale, onArea, frame, className = 'area-tool', title }: AreaToolProps): ReactElement => {
  const [drag, setDrag] = useState<{ start: Point; end: Point } | undefined>(undefined);

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrag(undefined);
    };
    window.addEventListener('keydown', cancel);
    return () => {
      window.removeEventListener('keydown', cancel);
    };
  }, []);

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    if (drag === undefined) return;
    const box = dragToBox(onPage(drag.start, frame), onPage(relativePoint(event), frame), scale, pageSize);
    setDrag(undefined);
    if (box !== undefined) onArea({ page, box });
  };

  return (
    <div
      className={className}
      data-testid={className}
      style={frameStyle(frame)}
      title={title}
      onPointerDown={(event) => {
        // Keeps receiving the drag outside a small frame (unreadable zones, FR-037).
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = relativePoint(event);
        setDrag({ start: point, end: point });
      }}
      onPointerMove={(event) => {
        if (drag !== undefined) setDrag({ start: drag.start, end: relativePoint(event) });
      }}
      onPointerUp={finish}
    >
      {drag !== undefined && <div className="area-tool__preview" data-testid="area-preview" style={previewStyle(drag.start, drag.end)} />}
    </div>
  );
};

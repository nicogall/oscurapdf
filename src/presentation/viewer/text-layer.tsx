import { useLayoutEffect, useRef, type ReactElement } from 'react';
import { unionOfBoxes } from '@shared-kernel';
import type { TextSpan } from '@app/views';
import { pageToScreen } from './page-geometry';

interface TextLayerProps {
  readonly text: string;
  readonly spans: readonly TextSpan[];
  readonly scale: number;
}

/** Stretches the rendered text horizontally so it covers the glyphs drawn on the canvas. */
const useFitWidth = (targetWidth: number) => {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || element.offsetWidth === 0) return;
    element.style.transform = `scaleX(${targetWidth / element.offsetWidth})`;
  }, [targetWidth]);
  return ref;
};

const SpanText = ({ span, text, scale }: { span: TextSpan; text: string; scale: number }): ReactElement | null => {
  const box = unionOfBoxes(span.charBoxes);
  const rect = box === undefined ? undefined : pageToScreen(box, scale);
  const ref = useFitWidth(rect?.width ?? 0);
  if (rect === undefined) return null;
  return (
    <span
      ref={ref}
      className="text-layer__span"
      data-char-start={span.range.start}
      style={{ left: `${rect.left}px`, top: `${rect.top}px`, height: `${rect.height}px`, fontSize: `${rect.height * 0.85}px` }}
    >
      {text.slice(span.range.start, span.range.end)}
    </span>
  );
};

/**
 * Transparent, selectable text over the page canvas. Each node carries the document offset of
 * its span, so a selection maps exactly to TextModel characters (research R2).
 */
export const TextLayer = ({ text, spans, scale }: TextLayerProps): ReactElement => (
  <div className="text-layer">
    {spans.map((span) => (
      <SpanText key={span.range.start} span={span} text={text} scale={scale} />
    ))}
  </div>
);

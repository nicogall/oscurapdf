/** Points to CSS pixels on a screen wide enough for the whole page. */
export const VIEWER_SCALE = 1.25;
/** Below this a page is unreadable even before zooming in. */
const MIN_SCALE = 0.3;

/**
 * The scale at which a page is drawn: the usual one, or smaller when the page would not fit in the
 * width it has (a phone), so that it is never cut off. An unknown width (nothing measured yet) keeps
 * the usual scale.
 */
export const fitScale = (availableWidth: number | undefined, pageWidth: number): number => {
  if (availableWidth === undefined || availableWidth <= 0 || pageWidth <= 0) return VIEWER_SCALE;
  return Math.max(MIN_SCALE, Math.min(VIEWER_SCALE, availableWidth / pageWidth));
};

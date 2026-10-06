import type { AreaOrigin } from '@shared-kernel/published';

export type LineArtMode = 'removeIfCovered' | 'removeIfTouched';

/**
 * Research R1 / FR-022: text redactions keep table borders crossing the area (fully covered only);
 * rectangle redactions remove every stroke they touch, so a partly covered signature cannot leak.
 */
export const lineArtModeFor = (origin: AreaOrigin): LineArtMode =>
  origin === 'area' ? 'removeIfTouched' : 'removeIfCovered';

import type { Result } from '@shared-kernel';
import type { RedactionPlan } from '@shared-kernel/published';
import type { GlyphBox } from '../../domain/checks/geometry-check';
import type { ImageSample } from '../../domain/checks/image-pixel-check';
import type { SideChannelValue } from '../../domain/checks/side-channel-check';

export interface Inspection {
  readonly pageCount: number;
  readonly pageTexts: readonly string[];
  readonly glyphs: readonly GlyphBox[];
  readonly sideChannelValues: readonly SideChannelValue[];
  readonly imageSamples: readonly ImageSample[];
  readonly revisionCount: number;
}

/** Low-level inspection of the output: glyph geometry, side channels, image pixels, revisions. */
export interface RedactionInspector {
  inspect(output: Uint8Array, plan: RedactionPlan): Promise<Result<Inspection, 'unparseable'>>;
}

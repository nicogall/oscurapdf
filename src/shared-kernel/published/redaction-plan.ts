import type { PageIndex } from '../geometry/page-index';
import type { PlannedArea } from './planned-area';

/** Input of the Redaction Engine and Verification (published language from Review). */
export interface RedactionPlan {
  readonly areasByPage: ReadonlyMap<PageIndex, readonly PlannedArea[]>;
  /** Normalized, de-duplicated texts; used for side-channel scrubbing and verification. */
  readonly redactedTexts: readonly string[];
}

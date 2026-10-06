import type { EntityId } from '@shared-kernel';
import type { ConfidenceLevel, PiiCategory } from '@shared-kernel/published';
import type { Occurrence } from './occurrence';

export type RedactionId = EntityId<'Redaction'>;
export type RedactionKind = 'text' | 'area';
export type RedactionSource = 'automatic' | 'manual';
export type RedactionCategory = PiiCategory | 'MANUAL';
/** `userConfirmed` if and only if `source = manual`. */
export type RedactionConfidence = ConfidenceLevel | 'userConfirmed';

/** One item to be removed. Every detection path and every manual action produces this entity. */
export interface Redaction {
  readonly id: RedactionId;
  readonly kind: RedactionKind;
  /** Display text (text redactions only). */
  readonly text?: string;
  /** Normalized text key (text redactions only); one redaction per key. */
  readonly key?: string;
  readonly occurrences: readonly Occurrence[];
  readonly category: RedactionCategory;
  readonly source: RedactionSource;
  readonly confidence: RedactionConfidence;
  readonly selected: boolean;
}

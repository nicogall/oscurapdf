import type { RedactionConfidence, RedactionSource } from './redaction';

/** Initial value (clarification 2026-10-01): manual and automatic High → selected; Medium/Low → shown unselected. */
export const initialSelection = (source: RedactionSource, confidence: RedactionConfidence): boolean =>
  source === 'manual' || confidence === 'high';

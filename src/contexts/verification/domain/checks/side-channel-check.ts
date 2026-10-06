import { findWholeWordOccurrences, normalizeText } from '@shared-kernel';
import { checkFrom, type VerificationCheck } from '../verification-check';

export interface SideChannelValue {
  readonly channel: string;
  readonly text: string;
}

/** None of the redacted texts appears in metadata, XMP, outlines, annotations, forms or attachments. */
export const sideChannelCheck = (values: readonly SideChannelValue[], redactedTexts: readonly string[]): VerificationCheck =>
  checkFrom(
    'sideChannels',
    values.flatMap(({ text }) => {
      const normalized = normalizeText(text).normalized;
      return redactedTexts.flatMap((redacted, redactionIndex) =>
        findWholeWordOccurrences(normalized, redacted).length > 0 ? [{ redactionIndex }] : [],
      );
    }),
  );

import type * as mupdf from 'mupdf';
import type { SideChannelRemoval } from '../../domain/export-result';

/** Removes redacted text from one side channel of the document (FR-021). */
export type SideChannelScrubber = (doc: mupdf.PDFDocument, redactedTexts: readonly string[]) => SideChannelRemoval;

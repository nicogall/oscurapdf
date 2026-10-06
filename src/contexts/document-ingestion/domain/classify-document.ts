import type { PageIndex } from '@shared-kernel';
import { MAX_DOCUMENT_BYTES, type SupportStatus } from './support-status';

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const HEADER_SEARCH_WINDOW = 1024;

export const classifyBySize = (byteSize: number): SupportStatus | undefined =>
  byteSize > MAX_DOCUMENT_BYTES ? { kind: 'tooLarge' } : undefined;

const headerAt = (bytes: Uint8Array, offset: number): boolean =>
  PDF_HEADER.every((byte, i) => bytes[offset + i] === byte);

/** PDF readers accept the header anywhere in the first 1024 bytes. */
export const looksLikePdf = (bytes: Uint8Array): boolean => {
  const last = Math.min(bytes.length, HEADER_SEARCH_WINDOW) - PDF_HEADER.length;
  for (let offset = 0; offset <= last; offset++) {
    if (headerAt(bytes, offset)) return true;
  }
  return false;
};

export const classifyPages = (pages: ReadonlyArray<{ readonly hasExtractableText: boolean }>): SupportStatus => {
  if (pages.length === 0) return { kind: 'invalid' };
  const pagesWithoutText = pages.flatMap((page, index) => (page.hasExtractableText ? [] : [index as PageIndex]));
  if (pagesWithoutText.length === pages.length) return { kind: 'imageOnly' };
  return pagesWithoutText.length === 0 ? { kind: 'supported' } : { kind: 'partiallySupported', pagesWithoutText };
};

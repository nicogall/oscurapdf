import type { PageIndex } from '@shared-kernel';

/** 50 MB hard limit, checked before parsing (FR-003a). */
export const MAX_DOCUMENT_BYTES = 52_428_800;

export type SupportStatus =
  | { readonly kind: 'supported' }
  | { readonly kind: 'partiallySupported'; readonly pagesWithoutText: readonly PageIndex[] }
  | { readonly kind: 'tooLarge' }
  | { readonly kind: 'notPdf' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'passwordProtected' }
  | { readonly kind: 'imageOnly' };

export type SupportKind = SupportStatus['kind'];


import type { PageIndex } from '@shared-kernel';
import type { DocumentView, IngestionError, TextModelView, UnreadableText } from '@ingestion';
import type { DocumentWorkspace } from './document-workspace';

/** UI-facing lifecycle of the current document (contracts/ui-contract.md screen states). */
export type SessionState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'rejected'; readonly reason: Exclude<IngestionError['code'], 'imageOnly'> }
  | { readonly kind: 'imageOnly' }
  | {
      readonly kind: 'reviewing';
      readonly document: DocumentView;
      readonly textModel: TextModelView;
      readonly pagesWithoutText: readonly PageIndex[];
      readonly unreadableText: UnreadableText;
      readonly workspace: DocumentWorkspace;
    };

export const EMPTY: SessionState = { kind: 'empty' };

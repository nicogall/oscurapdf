import { newEntityId, type EntityId } from '@shared-kernel';
import type { Page } from './page';
import type { SupportStatus } from './support-status';
import type { TextModel } from './text-model';

export type DocumentId = EntityId<'Document'>;

/** Read-only projection handed to other layers. `fileName` is display-only (FR-027). */
export interface DocumentView {
  readonly id: DocumentId;
  readonly fileName: string;
  readonly byteSize: number;
  readonly pages: readonly Page[];
  readonly support: SupportStatus;
}

/** Aggregate root of Document Ingestion. */
export interface Document extends DocumentView {
  readonly textModel: TextModel;
}

export const createDocument = (props: Omit<Document, 'id'>): Document => ({ id: newEntityId<'Document'>(), ...props });

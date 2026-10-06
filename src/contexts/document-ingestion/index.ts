// Public API of the Document Ingestion bounded context (constitution VI: import only via this barrel).
export { MAX_DOCUMENT_BYTES, type SupportStatus, type SupportKind } from './domain/support-status';
export { classifyBySize, classifyPages, looksLikePdf } from './domain/classify-document';
export { TextModel, type TextModelView } from './domain/text-model';
export type { TextSpan } from './domain/text-span';
export type { UnreadableText } from './domain/text-legibility';
export type { PageText, PageLine, PageChar } from './domain/page-text';
export type { Page, PageRotation, PageSize } from './domain/page';
export type { DocumentId, DocumentView } from './domain/document';
export type { PdfReader, PdfContents, ReaderError } from './application/ports/pdf-reader';
export type { PageRasterizer, PageBitmap } from './application/ports/page-rasterizer';
export {
  LoadDocument,
  type FileHandle,
  type IngestionError,
  type LoadedDocument,
} from './application/load-document';
export { RenderPage } from './application/render-page';
export { CloseDocument } from './application/close-document';
export { DocumentWorkerClient } from './infrastructure/document-worker-client';

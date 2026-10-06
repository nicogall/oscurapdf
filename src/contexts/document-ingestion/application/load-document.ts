import { err, ok, type PageIndex, type Result } from '@shared-kernel';
import { classifyBySize, classifyPages, looksLikePdf } from '../domain/classify-document';
import { createDocument, type DocumentView } from '../domain/document';
import { MAX_DOCUMENT_BYTES } from '../domain/support-status';
import { TextModel, type TextModelView } from '../domain/text-model';
import { separateUnreadable, type UnreadableText } from '../domain/text-legibility';
import type { PdfContents, PdfReader } from './ports/pdf-reader';

/** A file chosen by the user; bytes are read only after the size check. */
export interface FileHandle {
  readonly name: string;
  readonly size: number;
  bytes(): Promise<ArrayBuffer>;
}

export type IngestionError =
  | { readonly code: 'notPdf' }
  | { readonly code: 'invalid' }
  | { readonly code: 'tooLarge'; readonly limitBytes: typeof MAX_DOCUMENT_BYTES }
  | { readonly code: 'passwordProtected' }
  | { readonly code: 'imageOnly' };

export interface LoadedDocument {
  readonly document: DocumentView;
  readonly textModel: TextModelView;
  readonly pagesWithoutText: readonly PageIndex[];
  /** Text with a broken character map: not in the text model, shown as zones (FR-037). */
  readonly unreadableText: UnreadableText;
}

export class LoadDocument {
  constructor(private readonly reader: PdfReader) {}

  async execute(file: FileHandle): Promise<Result<LoadedDocument, IngestionError>> {
    if (classifyBySize(file.size)) return err({ code: 'tooLarge', limitBytes: MAX_DOCUMENT_BYTES });
    const bytes = await file.bytes();
    if (!looksLikePdf(new Uint8Array(bytes))) return err({ code: 'notPdf' });
    const read = await this.reader.read(bytes);
    if (!read.ok) return err({ code: read.error });
    return this.toLoaded(file, read.value);
  }

  private toLoaded(file: FileHandle, contents: PdfContents): Result<LoadedDocument, IngestionError> {
    const support = classifyPages(contents.pages);
    if (support.kind === 'imageOnly' || support.kind === 'invalid') return err({ code: support.kind });
    const { pages: readable, unreadable } = separateUnreadable(contents.text);
    const textModel = TextModel.build(readable);
    const document = createDocument({ fileName: file.name, byteSize: file.size, pages: contents.pages, support, textModel });
    const pagesWithoutText = support.kind === 'partiallySupported' ? support.pagesWithoutText : [];
    return ok({ document, textModel, pagesWithoutText, unreadableText: unreadable });
  }
}

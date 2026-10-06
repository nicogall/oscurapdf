import type { Result } from '@shared-kernel';
import type { Page } from '../../domain/page';
import type { PageText } from '../../domain/page-text';

export type ReaderError = 'invalid' | 'passwordProtected';

export interface PdfContents {
  readonly pages: readonly Page[];
  readonly text: readonly PageText[];
}

/** Opens a PDF and extracts page geometry and per-character text. */
export interface PdfReader {
  read(bytes: ArrayBuffer): Promise<Result<PdfContents, ReaderError>>;
  close(): Promise<void>;
}

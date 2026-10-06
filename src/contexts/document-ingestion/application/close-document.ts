import type { PdfReader } from './ports/pdf-reader';

/** Releases engine memory and document buffers (FR-031). */
export class CloseDocument {
  constructor(private readonly reader: PdfReader) {}

  execute(): Promise<void> {
    return this.reader.close();
  }
}

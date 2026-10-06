import { err, ok, type Result } from '@shared-kernel';
import type { PdfContents, PdfReader, ReaderError } from '@ingestion';

/** In-memory PdfReader: returns scripted contents and records calls. */
export class FakePdfReader implements PdfReader {
  readCalls = 0;
  closed = false;

  constructor(private readonly outcome: Result<PdfContents, ReaderError>) {}

  static returning(contents: PdfContents): FakePdfReader {
    return new FakePdfReader(ok(contents));
  }

  static failing(error: ReaderError): FakePdfReader {
    return new FakePdfReader(err(error));
  }

  read(): Promise<Result<PdfContents, ReaderError>> {
    this.readCalls += 1;
    return Promise.resolve(this.outcome);
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

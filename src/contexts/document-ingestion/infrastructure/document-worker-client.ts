import { err, ok, type PageIndex, type Result } from '@shared-kernel';
import type { RequestChannel } from '@workers/protocol';
import type { PageBitmap, PageRasterizer } from '../application/ports/page-rasterizer';
import type { PdfContents, PdfReader, ReaderError } from '../application/ports/pdf-reader';

const toReaderError = (code: string): ReaderError => (code === 'passwordProtected' ? 'passwordProtected' : 'invalid');

/** Main-thread adapter: implements the ingestion ports by talking to the document worker. */
export class DocumentWorkerClient implements PdfReader, PageRasterizer {
  constructor(private readonly client: RequestChannel) {}

  async read(bytes: ArrayBuffer): Promise<Result<PdfContents, ReaderError>> {
    const result = await this.client.request<PdfContents>('read', bytes, { transfer: [bytes] });
    return result.ok ? ok(result.value) : err(toReaderError(result.error.code));
  }

  async render(page: PageIndex, scale: number): Promise<Result<PageBitmap, 'renderFailed'>> {
    const result = await this.client.request<PageBitmap>('render', { page, scale });
    return result.ok ? ok(result.value) : err('renderFailed');
  }

  async close(): Promise<void> {
    await this.client.request('close', null);
  }
}

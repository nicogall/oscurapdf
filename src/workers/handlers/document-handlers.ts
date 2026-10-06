import type { PageIndex } from '@shared-kernel';
import type { PageRasterizer, PdfReader } from '@ingestion';
import { HandlerError, type Handler } from '../protocol';

/** The original bytes of the open document, kept in the worker for export (never mutated). */
export class DocumentBytes {
  private bytes: ArrayBuffer | undefined;

  set(bytes: ArrayBuffer): void {
    this.bytes = bytes;
  }

  current(): ArrayBuffer | undefined {
    return this.bytes;
  }

  clear(): void {
    this.bytes = undefined;
  }
}

export interface DocumentHandlerDeps {
  readonly reader: PdfReader;
  readonly rasterizer: PageRasterizer;
  readonly bytes: DocumentBytes;
}

interface RenderRequest {
  readonly page: PageIndex;
  readonly scale: number;
}

/** Plain, unit-testable handlers for the document worker (open/extract/render/close). */
export const createDocumentHandlers = ({ reader, rasterizer, bytes }: DocumentHandlerDeps): Record<string, Handler> => ({
  read: async (payload) => {
    const input = payload as ArrayBuffer;
    const result = await reader.read(input);
    if (!result.ok) throw new HandlerError(result.error);
    bytes.set(input);
    return result.value;
  },
  render: async (payload, context) => {
    const { page, scale } = payload as RenderRequest;
    const result = await rasterizer.render(page, scale);
    if (!result.ok) throw new HandlerError('renderFailed');
    context.transfer(result.value.image);
    return result.value;
  },
  close: async () => {
    await reader.close();
    bytes.clear();
    return null;
  },
});

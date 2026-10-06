/// <reference lib="webworker" />
// Thin entry: binds the protocol host to the document handlers. No logic here (plan.md).
import { MuPdfRasterizer } from '../contexts/document-ingestion/infrastructure/mupdf-rasterizer';
import { MuPdfReader } from '../contexts/document-ingestion/infrastructure/mupdf-reader';
import { MuPdfSession } from '../contexts/document-ingestion/infrastructure/mupdf-session';
import { MuPdfRedactionWriter } from '../contexts/redaction-engine/infrastructure/mupdf-redaction-writer';
import { DocumentBytes, createDocumentHandlers } from './handlers/document-handlers';
import { createExportHandler } from './handlers/export-handler';
import { WorkerHost } from './protocol';

const session = new MuPdfSession();
const bytes = new DocumentBytes();
const handlers = {
  ...createDocumentHandlers({ reader: new MuPdfReader(session), rasterizer: new MuPdfRasterizer(session), bytes }),
  export: createExportHandler(new MuPdfRedactionWriter(() => bytes.current())),
};

new WorkerHost(self, handlers).start();

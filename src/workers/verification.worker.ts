/// <reference lib="webworker" />
// Thin entry: binds the protocol host to the verification handlers. No logic here (plan.md).
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
import { MuPdfInspector } from '../contexts/verification/infrastructure/mupdf-inspector';
import { PdfJsParser } from '../contexts/verification/infrastructure/pdfjs-parser';
import { VerifyRedaction } from '../contexts/verification/application/verify-redaction';
import { createVerificationHandlers } from './handlers/verification-handlers';
import { WorkerHost } from './protocol';

// PDF.js normally parses in a worker of its own. This already is a worker, so its core runs right
// here: no nested worker and no second script loaded at the first verification. On an iPhone PDF.js
// could not open any output (reported 2026-10-06) and that loading step is the part that differs
// between browsers; this way the path is the same everywhere, and it works offline from the start.
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = { WorkerMessageHandler };

const verifier = new VerifyRedaction(new PdfJsParser(), new MuPdfInspector());
new WorkerHost(self, createVerificationHandlers(verifier)).start();

/// <reference lib="webworker" />
// Thin entry: binds the protocol host to the verification handlers. No logic here (plan.md).
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfjsWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { MuPdfInspector } from '../contexts/verification/infrastructure/mupdf-inspector';
import { PdfJsParser } from '../contexts/verification/infrastructure/pdfjs-parser';
import { VerifyRedaction } from '../contexts/verification/application/verify-redaction';
import { createVerificationHandlers } from './handlers/verification-handlers';
import { WorkerHost } from './protocol';

GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
// PDF.js starts its own worker only at the first verification: fetch it now, so the service worker
// caches it with the other engines and verification also works offline after the first document.
void fetch(pdfjsWorkerUrl).catch(() => undefined);

const verifier = new VerifyRedaction(new PdfJsParser(), new MuPdfInspector());
new WorkerHost(self, createVerificationHandlers(verifier)).start();

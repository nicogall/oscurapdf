import { CloseDocument, DocumentWorkerClient, LoadDocument, RenderPage } from '@ingestion';
import { DetectionWorkerClient, loadOnnxRuntime, SegmentedDetection } from '@detection';
import { EngineWorkerClient, ExportRedactedPdf, type RedactionWriter } from '@engine';
import { VerificationWorkerClient } from '@verification';
import { LazyWorkerClient, WorkerClient } from '@workers/protocol';
import type { AppServices } from './app-services';
import { DocumentSession } from './document-session';
import { workspaceFactory } from './document-workspace';
import { BrowserDownloadSink } from './infrastructure/browser-download-sink';
import { createLogger } from './infrastructure/create-logger';
import { DeferredDetector, ReleasedAfterUse, waitForServiceWorkerControl } from './infrastructure/deferred-detector';
import { detectionPoolSize } from './infrastructure/detection-pool-size';
import { detectionMode } from '../workers/detection-mode';
import { LocalStoragePreferenceStore } from './infrastructure/local-storage-preference-store';
import { ObjectUrls } from './infrastructure/object-urls';
import { RedactAndExport } from './redact-and-export';

/** How long the first detection waits for the offline service worker before running anyway. */
const SERVICE_WORKER_WAIT_MS = 10_000;

export interface CompositionOptions {
  /** Test builds only (`--mode e2e-fault`): wraps the writer to inject a fault. */
  readonly decorateWriter?: (writer: RedactionWriter) => RedactionWriter;
}

/**
 * The detection pool, created once the service worker controls the page (so model downloads are
 * cached offline): one worker per share of the device, and one ONNX runtime shared by all of them.
 */
/** A phone or tablet: the main pointer is a finger. */
const isHandheld = (): boolean => matchMedia('(pointer: coarse)').matches;

const createDetector = (): DeferredDetector =>
  new DeferredDetector(async (progress) => {
    progress(0);
    await waitForServiceWorkerControl(navigator.serviceWorker, import.meta.env.PROD ? SERVICE_WORKER_WAIT_MS : 0);
    const handheld = isHandheld();
    const size = detectionPoolSize({
      cores: navigator.hardwareConcurrency,
      memoryGb: (navigator as { deviceMemory?: number }).deviceMemory,
      isolated: crossOriginIsolated,
      handheld,
    });
    const name = detectionMode(handheld);
    const workers = Array.from({ length: size }, () => new Worker(new URL('../workers/detection.worker.ts', import.meta.url), { type: 'module', name }));
    const pool = workers.map((worker) => new DetectionWorkerClient(new WorkerClient(worker)));
    // The ONNX runtime (27 MB) is loaded and verified once here instead of once per worker.
    const runtime = await loadOnnxRuntime(import.meta.env.BASE_URL).catch(() => undefined);
    progress(1);
    if (runtime !== undefined) await Promise.all(pool.map((client) => client.useRuntime(runtime)));
    const detection = new SegmentedDetection(pool);
    return {
      warmUp: (report) => detection.warmUp(report),
      execute: (text, report, partial) => detection.execute(text, report, partial),
      dispose: () => {
        for (const worker of workers) worker.terminate();
      },
    };
  });

/** The only module that wires every context together (plan.md: composition root). */
export const createAppServices = (options: CompositionOptions = {}): AppServices => {
  const logger = createLogger(import.meta.env.PROD);
  // Vite bundles workers only for this exact inline pattern: new Worker(new URL(..., import.meta.url), ...).
  // Every worker starts on first use: the start page downloads none of the engines.
  const documentWorker = new LazyWorkerClient(() => new Worker(new URL('../workers/document.worker.ts', import.meta.url), { type: 'module' }));
  const verificationWorker = new LazyWorkerClient(() => new Worker(new URL('../workers/verification.worker.ts', import.meta.url), { type: 'module' }));
  const detector = createDetector();
  const documentClient = new DocumentWorkerClient(documentWorker);
  const engine = new EngineWorkerClient(documentWorker);
  const writer = options.decorateWriter ? options.decorateWriter(engine) : engine;
  const objectUrls = new ObjectUrls();
  const redactAndExport = new RedactAndExport({
    exporter: new ExportRedactedPdf(writer),
    verifier: new VerificationWorkerClient(verificationWorker),
    logger,
  });
  const session = new DocumentSession({
    loadDocument: new LoadDocument(documentClient),
    closeDocument: new CloseDocument(documentClient),
    objectUrls,
    logger,
    openWorkspace: workspaceFactory({
      redactAndExport,
      fileSink: new BrowserDownloadSink(objectUrls),
      // On a phone the model leaves memory once the suggestions are in: the verification needs the room.
      detector: isHandheld() ? new ReleasedAfterUse(detector) : detector,
      logger,
    }),
    prepareAnalysis: () => {
      void detector.warmUp();
      // Ready (and cached for offline use) before the first export.
      verificationWorker.warm();
    },
  });
  const renderPage = new RenderPage(documentClient);
  return { session, renderPage: (page, scale) => renderPage.execute(page, scale), preferences: new LocalStoragePreferenceStore(), logger };
};

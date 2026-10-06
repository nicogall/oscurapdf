/// <reference lib="webworker" />
// Thin entry: configures on-device NER and binds the protocol host to the detection handlers.
import { DETECTION_THREADS_PER_WORKER, DetectPii, RULE_DETECTORS } from '@detection';
import { chunkedFetch } from '../contexts/detection/infrastructure/chunked-fetch';
import { ModelCache } from '../contexts/detection/infrastructure/model-cache';
import { loadRuntimeAsBlobUrls, RUNTIME_VARIANT } from '../contexts/detection/infrastructure/runtime-assets';
import { createNerEnsemble } from '../contexts/detection/infrastructure/ner-models';
import { configureTransformers, createClassifierLoader, setRuntimePaths } from '../contexts/detection/infrastructure/transformers-environment';
import { createDetectionHandlers } from './handlers/detection-handlers';
import { WorkerHost } from './protocol';

/** WebGPU only when a real adapter exists; headless browsers expose navigator.gpu without one. */
const hasWebGpu = async (): Promise<boolean> => {
  const gpu = (self.navigator as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  try {
    return gpu !== undefined && (await gpu.requestAdapter()) != null;
  } catch {
    return false;
  }
};

const device = (await hasWebGpu()) ? 'webgpu' : 'wasm';
// Models and the ONNX Runtime binaries come only from our own origin (constitution I).
// Multi-threaded WASM only when the page is cross-origin isolated (COOP/COEP headers).
const threads = self.crossOriginIsolated ? Math.min(DETECTION_THREADS_PER_WORKER, self.navigator.hardwareConcurrency) : 1;
// The app may be published under a sub-path (GitHub Pages: /oscurapdf/).
const ORT_PATH = `${import.meta.env.BASE_URL}ort/`;
// The runtime binary (27 MB) is normally loaded once by the page and handed to every detection
// worker (useRuntime); a worker loads it itself only if it was not given one by the time a model is
// created. Blob URLs: ONNX Runtime's thread workers load it outside the service worker
// (offline-safe), and it may arrive in verified parts (static hosts limit file sizes).
let runtime: Promise<void> | undefined;
const useRuntime = (urls: { mjs: string; wasm: string }): void => {
  setRuntimePaths(urls);
  runtime = Promise.resolve();
};
const prepareRuntime = (): Promise<void> => {
  runtime ??= loadRuntimeAsBlobUrls(ORT_PATH, RUNTIME_VARIANT, chunkedFetch(fetch.bind(self), ORT_PATH)).then(setRuntimePaths);
  return runtime;
};
const MODELS_PATH = `${import.meta.env.BASE_URL}models/`;
// Static hosts limit file sizes, so large model files may arrive in verified parts.
const network = chunkedFetch(fetch.bind(self), MODELS_PATH);
configureTransformers({ localModelPath: MODELS_PATH, device, threads, cache: new ModelCache(() => caches.open('detection-models')), network });

// Model downloads (first use only) are reported to whichever request is running.
let reportDownload: (fraction: number) => void = () => undefined;
const loader = createClassifierLoader(
  device,
  (fraction) => {
    reportDownload(fraction);
  },
  prepareRuntime,
);
const detector = new DetectPii({ rules: RULE_DETECTORS, recognizer: createNerEnsemble(loader) });
new WorkerHost(
  self,
  createDetectionHandlers(detector, {
    bindDownloadProgress: (report) => {
      reportDownload = report;
    },
    useRuntime,
  }),
).start();

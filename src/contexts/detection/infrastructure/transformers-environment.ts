import { env, pipeline } from '@huggingface/transformers';
import { cachedModelFetch, type ModelCache } from './model-cache';
import type { ClassifierLoader, TokenClassifier } from './transformers-js-recognizer';

export interface TransformersConfig {
  /** Base path/URL of the self-hosted models (never the Hugging Face Hub). */
  readonly localModelPath: string;
  /** ONNX Runtime WASM location (browser only): a same-origin path, or explicit glue/binary URLs. */
  readonly wasmPaths?: string | { readonly mjs: string; readonly wasm: string };
  readonly device: 'webgpu' | 'wasm' | 'cpu';
  /** Browser only: where downloaded model files are kept for offline use (FR-029). */
  readonly cache?: ModelCache;
  /** WASM threads; more than 1 needs cross-origin isolation (SharedArrayBuffer). */
  readonly threads?: number;
  /** Network access for model files (browser: reassembles files split at build time). */
  readonly network?: typeof fetch;
}

/** Configures Transformers.js for fully local operation (constitution I, research R4). */
export const configureTransformers = (config: TransformersConfig): void => {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = config.localModelPath;
  // Model files are cached once, by our ModelCache, through a cache-first env.fetch.
  env.useBrowserCache = false;
  if (config.cache !== undefined) env.fetch = cachedModelFetch(config.cache, config.network);
  const wasm = env.backends.onnx.wasm;
  if (wasm === undefined) return;
  wasm.numThreads = config.threads ?? 1;
  if (config.wasmPaths !== undefined) wasm.wasmPaths = config.wasmPaths;
};

/** Points ONNX Runtime at its binary (set lazily, right before the first model is created). */
export const setRuntimePaths = (paths: NonNullable<TransformersConfig['wasmPaths']>): void => {
  const wasm = env.backends.onnx.wasm;
  if (wasm !== undefined) wasm.wasmPaths = paths;
};

interface DownloadInfo {
  readonly status?: string;
  readonly file?: string;
  readonly progress?: number;
}

/** Model-file download progress (0–1), reported only on first use (later loads hit the cache). */
export type DownloadProgress = (fraction: number) => void;

const forwardDownload = (report: DownloadProgress | undefined) => (info: DownloadInfo) => {
  if (info.status === 'progress' && info.file?.endsWith('.onnx') === true && info.progress !== undefined) report?.(info.progress / 100);
};

/**
 * Loads each model once; WebGPU falls back to WASM if the model cannot run there. `prepare` runs
 * before the first model is created (the browser loads the ONNX runtime binary only then).
 */
export const createClassifierLoader = (device: TransformersConfig['device'], onDownload?: DownloadProgress, prepare?: () => Promise<void>): ClassifierLoader => {
  const cache = new Map<string, Promise<TokenClassifier>>();
  const load = async (modelId: string): Promise<TokenClassifier> => {
    await prepare?.();
    try {
      const options = { dtype: 'q8', device, progress_callback: forwardDownload(onDownload) } as const;
      return await pipeline('token-classification', modelId, options);
    } catch (error) {
      if (device !== 'webgpu') throw error;
      const fallback = { dtype: 'q8', device: 'wasm', progress_callback: forwardDownload(onDownload) } as const;
      return await pipeline('token-classification', modelId, fallback);
    }
  };
  return (modelId) => {
    const cached = cache.get(modelId) ?? load(modelId);
    cache.set(modelId, cached);
    return cached;
  };
};

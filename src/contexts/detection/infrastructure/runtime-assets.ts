import { chunkedFetch } from './chunked-fetch';

/** The ONNX Runtime variant the app loads: `asyncify` serves both the WASM and the WebGPU backends. */
export const RUNTIME_VARIANT = 'ort-wasm-simd-threaded.asyncify';

export interface RuntimeUrls {
  readonly mjs: string;
  readonly wasm: string;
}

/**
 * Loads the ONNX Runtime glue and binary once and returns blob URLs for them. ONNX Runtime's thread
 * workers load these files themselves, outside the service worker, which broke offline detection
 * (FR-029); blob URLs need no network.
 */
export const loadRuntimeAsBlobUrls = async (base: string, variant: string, fetchImpl: typeof fetch = fetch): Promise<RuntimeUrls> => {
  const blobUrl = async (file: string, type: string): Promise<string> => {
    const response = await fetchImpl(`${base}${file}`);
    if (!response.ok) throw new Error(`runtime asset ${file}: HTTP ${response.status}`);
    return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type }));
  };
  return { mjs: await blobUrl(`${variant}.mjs`, 'text/javascript'), wasm: await blobUrl(`${variant}.wasm`, 'application/wasm') };
};

/** The app's ONNX runtime (published under `<base>ort/`, possibly in verified parts), as blob URLs. */
export const loadOnnxRuntime = (base: string, fetchImpl: typeof fetch = fetch): Promise<RuntimeUrls> =>
  loadRuntimeAsBlobUrls(`${base}ort/`, RUNTIME_VARIANT, chunkedFetch(fetchImpl, `${base}ort/`));

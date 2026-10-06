import type { Plugin } from 'vite';

const BUNDLED_ORT_WASM = /^assets\/ort-wasm-[^/]*\.wasm$/u;

/**
 * Transformers.js references a fallback copy of the ONNX Runtime binary, which Vite emits into
 * assets/ (26 MiB: over the host file limit, and precached by the service worker for nothing). The
 * app always passes the runtime explicitly (public/ort, as verified parts), so the copy is dropped.
 */
export const dropBundledOrtWasmPlugin = (): Plugin => ({
  name: 'redactor-drop-bundled-ort-wasm',
  apply: 'build',
  generateBundle: (_options, bundle) => {
    for (const fileName of Object.keys(bundle)) {
      if (BUNDLED_ORT_WASM.test(fileName)) Reflect.deleteProperty(bundle, fileName);
    }
  },
});

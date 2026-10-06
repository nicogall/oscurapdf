import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { cspPlugin } from './tools/vite/csp-plugin.ts';
import { dropBundledOrtWasmPlugin } from './tools/vite/drop-bundled-ort-wasm.ts';
import { splitLargeFilesPlugin } from './tools/vite/split-large-files.ts';

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export const aliases = {
  '@shared-kernel': fromRoot('./src/shared-kernel'),
  '@ingestion': fromRoot('./src/contexts/document-ingestion/index.ts'),
  '@detection': fromRoot('./src/contexts/detection/index.ts'),
  '@review': fromRoot('./src/contexts/redaction-review/index.ts'),
  '@engine': fromRoot('./src/contexts/redaction-engine/index.ts'),
  '@verification': fromRoot('./src/contexts/verification/index.ts'),
  '@app': fromRoot('./src/app'),
  '@workers': fromRoot('./src/workers'),
};

const faultAliases = {
  '@app/composition-root': fromRoot('./src/app/composition-root.e2e-fault.ts'),
};

/** Cross-origin isolation enables multi-threaded WASM inference (every resource is same-origin). */
const ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  // credentialless: isolation (threads) in Chromium and Firefox; Safari ignores it and runs single-threaded,
  // whereas require-corp made WebKit block worker module chunks.
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/** Where the app is published: `/` locally, `/oscurapdf/` on GitHub Pages (set by the Pages workflow). */
const BASE_PATH = process.env.BASE_PATH ?? '/';

export default defineConfig(({ mode }) => ({
  base: BASE_PATH,
  server: { headers: ISOLATION_HEADERS },
  preview: { headers: ISOLATION_HEADERS },
  plugins: [
    react(),
    cspPlugin(),
    splitLargeFilesPlugin(),
    dropBundledOrtWasmPlugin(),
    VitePWA({
      // Our own service worker (src/service-worker/sw.ts): it also adds the isolation headers.
      strategies: 'injectManifest',
      srcDir: 'src/service-worker',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        // Only the start page is precached; the engines are cached on first use (sw.ts), so the
        // first visit downloads nothing heavy until a document is opened.
        globPatterns: ['**/*.{js,css,html}', 'favicon.svg'],
        globIgnores: ['ort/**', 'models/**', 'assets/*.worker-*.js', 'assets/pdf.worker*', 'assets/*.wasm'],
        maximumFileSizeToCacheInBytes: 64 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: mode === 'e2e-fault' ? { ...faultAliases, ...aliases } : aliases,
  },
  // Worker bundles are built separately: the fallback ONNX Runtime copy comes from the detection worker.
  worker: { format: 'es', plugins: () => [dropBundledOrtWasmPlugin()] },
  optimizeDeps: { exclude: ['mupdf'] },
  assetsInclude: ['**/*.wasm'],
  build: { target: 'es2023' },
}));

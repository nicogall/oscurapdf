/**
 * Copies the ONNX Runtime WASM binary into public/ort/ so it is served from our own origin.
 * By default Transformers.js would load it from a CDN, which constitution I forbids. Only the
 * variant the app loads is shipped: `asyncify` serves both the WASM and the WebGPU backends.
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = 'node_modules/onnxruntime-web/dist';
const TARGET = 'public/ort';

export const RUNTIME_VARIANT = 'ort-wasm-simd-threaded.asyncify';

export const isRuntimeAsset = (file: string): boolean => file === `${RUNTIME_VARIANT}.wasm` || file === `${RUNTIME_VARIANT}.mjs`;

const main = (): void => {
  rmSync(TARGET, { recursive: true, force: true });
  mkdirSync(TARGET, { recursive: true });
  const files = readdirSync(SOURCE).filter(isRuntimeAsset);
  for (const file of files) copyFileSync(join(SOURCE, file), join(TARGET, file));
  console.log(`runtime-assets: copied ${files.length} files to ${TARGET}`);
};

if (process.argv[1]?.endsWith('copy.ts')) main();

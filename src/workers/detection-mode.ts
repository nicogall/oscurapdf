/**
 * How a detection worker is started, passed as the worker's name (it needs no message and is known
 * before the worker loads anything).
 *
 * On an iPhone 16 Safari closed the page when the model ran on WebGPU, and the same model on WASM
 * worked (tested 2026-10-06), so phones and tablets never use the GPU.
 */
/** The model on WebGPU when there is an adapter, otherwise on WASM. */
export const WITH_MODEL = 'with-model';
/** The model on WASM, never on the GPU. */
export const WASM_MODEL = 'wasm-model';

export const detectionMode = (handheld: boolean): string => (handheld ? WASM_MODEL : WITH_MODEL);

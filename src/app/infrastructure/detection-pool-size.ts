import { DETECTION_THREADS_PER_WORKER } from '@detection';

export interface DeviceCapacity {
  /** navigator.hardwareConcurrency (logical cores). */
  readonly cores: number;
  /** navigator.deviceMemory in GB (Chromium only; undefined elsewhere). */
  readonly memoryGb: number | undefined;
  /** Cross-origin isolated: each worker can use WASM threads. */
  readonly isolated: boolean;
  /** A phone or tablet (the main pointer is a finger). Their browsers do not report memory. */
  readonly handheld: boolean;
}

/** Each detection worker holds its own copy of the model (~250 MB in memory). */
export const MAX_THREADED_WORKERS = 3;
/** Without WASM threads (Safari) each worker is ~6× slower, so more of them pay off. */
export const MAX_SINGLE_THREADED_WORKERS = 4;
/** Cores left for the page and the other workers when workers are single-threaded. */
const RESERVED_CORES = 2;
const LOW_MEMORY_GB = 4;

const clamp = (value: number, max: number): number => Math.min(max, Math.max(1, value));

/**
 * How many detection workers to run in parallel. Measured on 43 pages, 10 cores (2026-10-01):
 * 1 worker × 4 threads 19.3 s, 2 × 4 12.2 s, 4 × 2 11.3 s (twice the memory), 1 × 1 115 s, 6 × 1 18.4 s.
 */
export const detectionPoolSize = ({ cores, memoryGb, isolated, handheld }: DeviceCapacity): number => {
  // A phone has many cores and little memory for one tab: one copy of the model is enough there.
  if (handheld || (memoryGb !== undefined && memoryGb <= LOW_MEMORY_GB)) return 1;
  if (isolated) return clamp(Math.floor(cores / DETECTION_THREADS_PER_WORKER), MAX_THREADED_WORKERS);
  return clamp(cores - RESERVED_CORES, MAX_SINGLE_THREADED_WORKERS);
};

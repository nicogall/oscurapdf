import { beforeEach, describe, expect, it, vi } from 'vitest';

const pipeline = vi.fn();
const env = { allowRemoteModels: true, allowLocalModels: false, localModelPath: '', useBrowserCache: true, fetch: undefined as unknown, backends: { onnx: { wasm: { wasmPaths: '', numThreads: 4 } } } };
vi.mock('@huggingface/transformers', () => ({ env, pipeline }));

const { configureTransformers, createClassifierLoader, setRuntimePaths } = await import('../../../src/contexts/detection/infrastructure/transformers-environment');
const { ModelCache } = await import('../../../src/contexts/detection/infrastructure/model-cache');

beforeEach(() => {
  pipeline.mockReset();
});

describe('configureTransformers (fully local, constitution I)', () => {
  it('disables remote models and the default browser cache, and uses our origin for models and ORT', () => {
    configureTransformers({ localModelPath: '/models/', wasmPaths: '/ort/', device: 'wasm', cache: new ModelCache(() => Promise.resolve({} as Cache)) });
    expect(env).toMatchObject({ allowRemoteModels: false, allowLocalModels: true, localModelPath: '/models/', useBrowserCache: false });
    expect(env.backends.onnx.wasm).toEqual({ wasmPaths: '/ort/', numThreads: 1 });
    expect(typeof env.fetch).toBe('function');
  });
});

describe('lazy ONNX runtime', () => {
  it('does nothing about the runtime where there is no WASM backend (Node)', () => {
    const wasm = env.backends.onnx.wasm;
    (env.backends.onnx as { wasm?: unknown }).wasm = undefined;
    configureTransformers({ localModelPath: '/models/', device: 'cpu', threads: 4 });
    setRuntimePaths('/ort/');
    expect(env.backends.onnx.wasm).toBeUndefined();
    env.backends.onnx.wasm = wasm;
  });

  it('threads are set at configuration, the runtime paths later (before the first model)', async () => {
    configureTransformers({ localModelPath: '/models/', device: 'wasm', threads: 4 });
    expect(env.backends.onnx.wasm.numThreads).toBe(4);
    setRuntimePaths({ mjs: 'blob:m', wasm: 'blob:w' });
    expect(env.backends.onnx.wasm.wasmPaths).toEqual({ mjs: 'blob:m', wasm: 'blob:w' });
    const order: string[] = [];
    pipeline.mockImplementation(() => {
      order.push('pipeline');
      return Promise.resolve('classifier');
    });
    const prepare = () => {
      order.push('prepare');
      return Promise.resolve();
    };
    await createClassifierLoader('wasm', undefined, prepare)('model');
    expect(order).toEqual(['prepare', 'pipeline']);
  });
});

describe('createClassifierLoader', () => {
  it('loads each model once and reports .onnx download progress', async () => {
    const reports: number[] = [];
    pipeline.mockImplementation((_task: string, _id: string, options: { progress_callback: (info: object) => void }) => {
      options.progress_callback({ status: 'progress', file: 'onnx/model_quantized.onnx', progress: 50 });
      options.progress_callback({ status: 'progress', file: 'tokenizer.json', progress: 90 });
      return Promise.resolve('classifier');
    });
    const load = createClassifierLoader('wasm', (f) => reports.push(f));
    await load('a');
    await load('a');
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(reports).toEqual([0.5]);
  });

  it('falls back from WebGPU to WASM', async () => {
    pipeline.mockRejectedValueOnce(new Error('no adapter')).mockResolvedValueOnce('wasm-classifier');
    expect(await createClassifierLoader('webgpu')('b')).toBe('wasm-classifier');
    expect(pipeline.mock.calls.map((c) => (c[2] as { device: string }).device)).toEqual(['webgpu', 'wasm']);
  });

  it('rethrows failures that are not WebGPU-related', async () => {
    pipeline.mockRejectedValue(new Error('missing model'));
    await expect(createClassifierLoader('wasm')('c')).rejects.toThrow('missing model');
  });
});

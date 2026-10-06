import { describe, expect, it } from 'vitest';
import { fileUrl, isValid, modelDir, sha256 } from './fetch';

const bytes = new TextEncoder().encode('model-bytes');

describe('fetch-models', () => {
  it('builds a pinned directory per model and commit', () => {
    expect(modelDir({ id: 'org/name', commit: 'abc', files: [] })).toBe('public/models/org/name');
  });

  it('accepts a file only when size and SHA-256 match the lock', () => {
    const file = { path: 'x', sha256: sha256(bytes), size: bytes.byteLength };
    expect(isValid(bytes, file)).toBe(true);
    expect(isValid(bytes, { ...file, size: 1 })).toBe(false);
    expect(isValid(bytes, { ...file, sha256: '0'.repeat(64) })).toBe(false);
  });

  it('downloads from the Hub by id and commit, or from a release by base name', () => {
    const file = { path: 'onnx/model.onnx', sha256: '', size: 0 };
    expect(fileUrl({ id: 'org/name', commit: 'abc', files: [] }, file)).toBe('https://huggingface.co/org/name/resolve/abc/onnx/model.onnx');
    expect(fileUrl({ id: 'org/name', commit: 'v1', baseUrl: 'https://example.com/releases/download/v1', files: [] }, file)).toBe(
      'https://example.com/releases/download/v1/model.onnx',
    );
  });
});

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deployProblems, HOST_FILE_LIMIT } from './check';

describe('deploy check', () => {
  it('accepts a build with small files and a headers file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'deploy-'));
    writeFileSync(join(dir, '_headers'), '/*');
    writeFileSync(join(dir, 'index.html'), '<html>');
    expect(deployProblems(dir)).toEqual([]);
  });

  it('reports files above the host limit and a missing headers file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'deploy-'));
    writeFileSync(join(dir, 'model.onnx'), Buffer.alloc(HOST_FILE_LIMIT + 1));
    expect(deployProblems(dir)).toEqual([expect.stringContaining('model.onnx is 25 MiB'), expect.stringContaining('_headers is missing')]);
  });
});

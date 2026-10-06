import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ChunkIndex } from '../../src/contexts/detection/infrastructure/chunk-index';
import { splitLargeFiles } from './split-large-files';

describe('splitting large model files for static hosts', () => {
  it('splits only files above the limit, records size and SHA-256 of each part, removes the original', () => {
    const dir = mkdtempSync(join(tmpdir(), 'split-'));
    mkdirSync(join(dir, 'org', 'model', 'onnx'), { recursive: true });
    const big = Buffer.from(Array.from({ length: 25 }, (_, i) => i));
    writeFileSync(join(dir, 'org', 'model', 'onnx', 'model.onnx'), big);
    writeFileSync(join(dir, 'org', 'model', 'config.json'), '{}');
    expect(splitLargeFiles(dir, 20, 10)).toHaveLength(1);
    const index = JSON.parse(readFileSync(join(dir, 'chunks.json'), 'utf8')) as ChunkIndex;
    const entry = index.files['org/model/onnx/model.onnx'];
    expect(entry?.size).toBe(25);
    expect(entry?.parts.map((p) => [p.name, p.size])).toEqual([['model.onnx.part000', 10], ['model.onnx.part001', 10], ['model.onnx.part002', 5]]);
    expect(entry?.parts[0]?.sha256).toBe(createHash('sha256').update(big.subarray(0, 10)).digest('hex'));
    expect(existsSync(join(dir, 'org', 'model', 'onnx', 'model.onnx'))).toBe(false);
    expect(existsSync(join(dir, 'org', 'model', 'config.json'))).toBe(true);
  });
});

/**
 * Static hosts limit the size of a single file (Cloudflare Pages: 25 MiB). After the build, every
 * file under <outDir>/models and <outDir>/ort larger than the limit is split into parts, and a
 * chunks.json in each folder records each part's size and SHA-256; the app reassembles and
 * verifies them (chunked-fetch).
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
import { CHUNK_INDEX, type ChunkIndex, type ChunkPart } from '../../src/contexts/detection/infrastructure/chunk-index.ts';

export const MAX_FILE_BYTES = 24 * 1024 * 1024;
/** Small enough for smooth download progress, large enough to keep the number of requests low. */
export const PART_BYTES = 8 * 1024 * 1024;
const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)]));

const splitFile = (path: string, partBytes: number): ChunkPart[] => {
  const data = readFileSync(path);
  const parts: ChunkPart[] = [];
  for (let offset = 0, index = 0; offset < data.length; offset += partBytes, index++) {
    const part = data.subarray(offset, offset + partBytes);
    const name = `${path.split(sep).at(-1) ?? 'file'}.part${String(index).padStart(3, '0')}`;
    writeFileSync(`${path}.part${String(index).padStart(3, '0')}`, part);
    parts.push({ name, size: part.length, sha256: createHash('sha256').update(part).digest('hex') });
  }
  rmSync(path);
  return parts;
};

/** Folders whose large files are split (each gets its own chunks.json). */
export const SPLIT_FOLDERS = ['models', 'ort'];

/** Splits the large files of `folder` in place and writes its index. Returns the split paths. */
export const splitLargeFiles = (folder: string, maxBytes = MAX_FILE_BYTES, partBytes = PART_BYTES): string[] => {
  const files: Record<string, ChunkIndex['files'][string]> = {};
  const large = filesUnder(folder).filter((path) => statSync(path).size > maxBytes);
  for (const path of large) {
    const size = statSync(path).size;
    files[relative(folder, path).split(sep).join('/')] = { size, parts: splitFile(path, partBytes) };
  }
  const index: ChunkIndex = { files };
  writeFileSync(join(folder, CHUNK_INDEX), JSON.stringify(index, null, 2));
  return large;
};

/** Vite plugin: runs after the bundle is written (builds only). */
export const splitLargeFilesPlugin = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'redactor-split-large-files',
    apply: 'build',
    configResolved: (config) => {
      outDir = config.build.outDir;
    },
    closeBundle: () => {
      for (const folder of SPLIT_FOLDERS.map((name) => join(outDir, name))) {
        if (statSync(folder, { throwIfNoEntry: false })?.isDirectory() !== true) continue;
        for (const path of splitLargeFiles(folder)) console.log(`split-large-files: ${path} split into parts`);
      }
    },
  };
};

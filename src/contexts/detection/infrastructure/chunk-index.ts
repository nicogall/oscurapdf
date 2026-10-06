/**
 * Index of files split into parts at build time (tools/vite/split-large-files.ts), because static
 * hosts limit the size of a single file. One per split folder: <models>/chunks.json, <ort>/chunks.json.
 */
export const CHUNK_INDEX = 'chunks.json';

export interface ChunkPart {
  /** File name of the part, in the same folder as the original file. */
  readonly name: string;
  readonly size: number;
  /** Hex SHA-256 of the part. */
  readonly sha256: string;
}

export interface ChunkIndex {
  /** Path relative to the folder (forward slashes) → its parts, in order. */
  readonly files: Readonly<Record<string, { readonly size: number; readonly parts: readonly ChunkPart[] }>>;
}

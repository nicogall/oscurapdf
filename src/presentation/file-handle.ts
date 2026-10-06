import type { FileHandle } from '@app/views';

/** Wraps a browser File; bytes are read only when the app asks (after the size check). */
export const fromFile = (file: File): FileHandle => ({
  name: file.name,
  size: file.size,
  bytes: () => file.arrayBuffer(),
});

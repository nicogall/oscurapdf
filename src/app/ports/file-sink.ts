/** Offers the output file to the user for saving (never uploads it). */
export interface FileSink {
  save(bytes: Uint8Array, fileName: string): void;
}

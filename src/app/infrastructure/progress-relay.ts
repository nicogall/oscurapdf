export type ProgressListener = (fraction: number) => void;

/**
 * Forwards progress (0–1) to whoever listens, including listeners that join late: they get the
 * latest value at once. Used for the one-off preparation of the analysis tools.
 */
export class ProgressRelay {
  private latest: number | undefined;
  private readonly listeners = new Set<ProgressListener>();

  emit(fraction: number): void {
    this.latest = fraction;
    for (const listener of this.listeners) listener(fraction);
  }

  /** Returns the function that stops listening. */
  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    if (this.latest !== undefined) listener(this.latest);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

import { err, ok, type Result } from '@shared-kernel';
import { isProgress, type ResponseMessage, type WorkerError } from './envelope';

export type ProgressListener = (stage: string, fraction: number) => void;

interface PendingEntry {
  readonly settle: (result: Result<unknown, WorkerError>) => void;
  readonly onProgress: ProgressListener | undefined;
}

/** Correlates responses and progress events with outstanding requests by id. */
export class PendingRequests {
  private readonly entries = new Map<string, PendingEntry>();

  add(id: string, entry: PendingEntry): void {
    this.entries.set(id, entry);
  }

  handle(message: ResponseMessage): void {
    const entry = this.entries.get(message.id);
    if (entry === undefined) return;
    if (isProgress(message)) {
      entry.onProgress?.(message.stage, message.fraction);
      return;
    }
    this.entries.delete(message.id);
    entry.settle(message.ok ? ok(message.result) : err(message.error));
  }

  /** Settles every outstanding request with the same error (e.g. the worker failed to load). */
  failAll(error: WorkerError): void {
    for (const [id, entry] of this.entries) {
      this.entries.delete(id);
      entry.settle(err(error));
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

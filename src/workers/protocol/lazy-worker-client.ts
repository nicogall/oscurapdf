import type { Result } from '@shared-kernel';
import type { MessagePortLike, WorkerError } from './envelope';
import { WorkerClient, type RequestOptions } from './worker-client';

/** What the context clients need from a worker connection. */
export interface RequestChannel {
  request<R>(kind: string, payload: unknown, options?: RequestOptions): Promise<Result<R, WorkerError>>;
}

/**
 * A worker started on its first request, not when the app loads: the start page downloads none
 * of the heavy engines (MuPDF, PDF.js, the AI runtime) until a document is actually opened.
 */
export class LazyWorkerClient implements RequestChannel {
  private client: WorkerClient | undefined;

  constructor(private readonly start: () => MessagePortLike) {}

  request<R>(kind: string, payload: unknown, options?: RequestOptions): Promise<Result<R, WorkerError>> {
    return this.connect().request<R>(kind, payload, options);
  }

  /** Starts the worker ahead of its first request (it loads, and its files get cached for offline use). */
  warm(): void {
    this.connect();
  }

  private connect(): WorkerClient {
    this.client ??= new WorkerClient(this.start());
    return this.client;
  }
}

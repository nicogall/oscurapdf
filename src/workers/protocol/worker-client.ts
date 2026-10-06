import { err, type Result } from '@shared-kernel';
import { PROTOCOL_VERSION, isReady, type MessagePortLike, type ReadyMessage, type ResponseMessage, type WorkerError } from './envelope';
import { PendingRequests, type ProgressListener } from './pending-requests';

export interface RequestOptions {
  readonly transfer?: Transferable[];
  readonly onProgress?: ProgressListener;
  readonly signal?: AbortSignal;
}

/**
 * Main-thread side of the protocol: request/response with progress, cancel and transfer.
 * Messages are queued until the host announces `ready`, because a worker still running its
 * top-level await (e.g. WASM instantiation) drops messages that arrive before it listens.
 */
export class WorkerClient {
  private readonly pending = new PendingRequests();
  private ready = false;
  private unavailable = false;
  private readonly outbox: Array<{ message: unknown; transfer: Transferable[] }> = [];

  constructor(private readonly port: MessagePortLike) {
    this.port.addEventListener('message', (event) => {
      const message = event.data as ResponseMessage | ReadyMessage;
      if (isReady(message)) this.flush();
      else this.pending.handle(message);
    });
    // A worker script that fails to load never says "ready": fail requests instead of hanging.
    this.port.addEventListener('error', () => {
      this.unavailable = true;
      this.outbox.length = 0;
      this.pending.failAll({ code: 'workerUnavailable' });
    });
  }

  request<R>(kind: string, payload: unknown, options: RequestOptions = {}): Promise<Result<R, WorkerError>> {
    if (this.unavailable) return Promise.resolve(err({ code: 'workerUnavailable' }));
    const id = crypto.randomUUID();
    const response = new Promise<Result<R, WorkerError>>((settle) => {
      this.pending.add(id, { settle: settle as (r: Result<unknown, WorkerError>) => void, onProgress: options.onProgress });
    });
    options.signal?.addEventListener('abort', () => {
      this.send({ v: PROTOCOL_VERSION, id, kind: 'cancel' }, []);
    });
    this.send({ v: PROTOCOL_VERSION, id, kind, payload }, options.transfer ?? []);
    return response;
  }

  private send(message: unknown, transfer: Transferable[]): void {
    if (this.ready) this.port.postMessage(message, transfer);
    else this.outbox.push({ message, transfer });
  }

  private flush(): void {
    this.ready = true;
    for (const { message, transfer } of this.outbox.splice(0)) this.port.postMessage(message, transfer);
  }
}

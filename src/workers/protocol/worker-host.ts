import { PROTOCOL_VERSION, type InboundMessage, type MessagePortLike, type RequestMessage } from './envelope';

/** A failure a handler reports on purpose; only the code crosses the worker boundary. */
export class HandlerError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export interface HandlerContext {
  progress(stage: string, fraction: number): void;
  /** Throws a `cancelled` HandlerError if this request was cancelled. Call between pages/chunks. */
  checkpoint(): void;
  /** Registers buffers to transfer (not copy) with the response. */
  transfer(...buffers: Transferable[]): void;
}

export type Handler = (payload: unknown, context: HandlerContext) => Promise<unknown>;

/** Worker side of the protocol: dispatch by kind, cancellation checkpoints, code-only errors. */
export class WorkerHost {
  private readonly cancelled = new Set<string>();

  constructor(
    private readonly port: MessagePortLike,
    private readonly handlers: Readonly<Record<string, Handler>>,
  ) {}

  start(): void {
    this.port.addEventListener('message', (event) => {
      void this.receive(event.data as InboundMessage);
    });
    this.port.postMessage({ v: PROTOCOL_VERSION, kind: 'ready' });
  }

  private async receive(message: InboundMessage): Promise<void> {
    if (message.kind === 'cancel') {
      this.cancelled.add(message.id);
      return;
    }
    await this.run(message as RequestMessage);
  }

  private async run(message: RequestMessage): Promise<void> {
    const handler = this.handlers[message.kind];
    const transfers: Transferable[] = [];
    const reply = { v: PROTOCOL_VERSION, id: message.id, kind: message.kind };
    try {
      if (handler === undefined) throw new HandlerError('unknownKind');
      const result = await handler(message.payload, this.contextFor(message.id, transfers));
      this.port.postMessage({ ...reply, ok: true, result }, transfers);
    } catch (error) {
      const code = error instanceof HandlerError ? error.code : 'internal';
      this.port.postMessage({ ...reply, ok: false, error: { code } });
    } finally {
      this.cancelled.delete(message.id);
    }
  }

  private contextFor(id: string, transfers: Transferable[]): HandlerContext {
    return {
      progress: (stage, fraction) => {
        this.port.postMessage({ v: PROTOCOL_VERSION, id, kind: 'progress', stage, fraction });
      },
      checkpoint: () => {
        if (this.cancelled.has(id)) throw new HandlerError('cancelled');
      },
      transfer: (...buffers) => transfers.push(...buffers),
    };
  }
}

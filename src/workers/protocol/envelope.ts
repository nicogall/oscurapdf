/** Typed, versioned worker messages (contracts/ports-and-workers.md). Errors carry codes only. */
export const PROTOCOL_VERSION = 1;

export interface RequestMessage<P = unknown> {
  readonly v: typeof PROTOCOL_VERSION;
  readonly id: string;
  readonly kind: string;
  readonly payload: P;
}

export interface CancelMessage {
  readonly v: typeof PROTOCOL_VERSION;
  readonly id: string;
  readonly kind: 'cancel';
}

export interface ProgressMessage {
  readonly v: typeof PROTOCOL_VERSION;
  readonly id: string;
  readonly kind: 'progress';
  readonly stage: string;
  readonly fraction: number;
}

export interface SuccessMessage<R = unknown> {
  readonly v: typeof PROTOCOL_VERSION;
  readonly id: string;
  readonly kind: string;
  readonly ok: true;
  readonly result: R;
}

export interface FailureMessage {
  readonly v: typeof PROTOCOL_VERSION;
  readonly id: string;
  readonly kind: string;
  readonly ok: false;
  readonly error: WorkerError;
}

export interface WorkerError {
  readonly code: string;
}

/** Sent once by the host when it listens. Workers with top-level await drop earlier messages. */
export interface ReadyMessage {
  readonly v: typeof PROTOCOL_VERSION;
  readonly kind: 'ready';
}

export type ResponseMessage = SuccessMessage | FailureMessage | ProgressMessage;
export type InboundMessage = RequestMessage | CancelMessage;

/** Minimal surface shared by Worker, MessagePort and a worker's global scope. */
export interface MessagePortLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

export const isProgress = (message: ResponseMessage): message is ProgressMessage => message.kind === 'progress';

export const isReady = (message: ResponseMessage | ReadyMessage): message is ReadyMessage => message.kind === 'ready';

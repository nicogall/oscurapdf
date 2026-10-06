export type Listener = () => void;
export type Unsubscribe = () => void;

/** Minimal observable value for `useSyncExternalStore`. */
export class ObservableStore<T> {
  private readonly listeners = new Set<Listener>();

  constructor(private value: T) {}

  get(): T {
    return this.value;
  }

  set(next: T): void {
    this.value = next;
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

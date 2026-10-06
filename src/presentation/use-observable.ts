import { useSyncExternalStore } from 'react';

/** Subscribes a component to any observable store (session, review, export flow). */
export const useObservable = <T>(subscribe: (listener: () => void) => () => void, read: () => T): T =>
  useSyncExternalStore(subscribe, read);

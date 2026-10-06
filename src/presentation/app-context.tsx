import { createContext, useContext, useSyncExternalStore } from 'react';
import type { AppServices } from '@app/app-services';
import type { SessionState } from '@app/session-state';

export const ServicesContext = createContext<AppServices | undefined>(undefined);

export const useServices = (): AppServices => {
  const services = useContext(ServicesContext);
  if (services === undefined) throw new Error('ServicesContext is missing');
  return services;
};

export const useSessionState = (): SessionState => {
  const { session } = useServices();
  return useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.snapshot(),
  );
};

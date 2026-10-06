export interface ControllerSource {
  readonly controller: unknown;
  addEventListener(type: 'controllerchange', listener: () => void): void;
}

export interface IsolationReloadDeps {
  readonly container: ControllerSource | undefined;
  /** `crossOriginIsolated` at page load. */
  readonly isolated: boolean;
  /** False while a document is open: never lose the user's work for speed. */
  readonly canReload: () => boolean;
  /**
   * Whether the server already sends the isolation headers: then a reload cannot help (the page is
   * isolated already, or the browser ignores them, like Safari with `credentialless`).
   */
  readonly serverSendsIsolation: () => Promise<boolean>;
  readonly reload: () => void;
}

/**
 * On hosts that cannot send the isolation headers (GitHub Pages) they come from the service worker,
 * which controls the page only from the second load. On the very first visit, once the service
 * worker takes control, the page reloads once so detection can use WASM threads. Returns whether
 * a reload was armed.
 */
export const reloadOnceForIsolation = ({ container, isolated, canReload, serverSendsIsolation, reload }: IsolationReloadDeps): boolean => {
  // Already isolated (headers from the server), or the page is already served by the worker.
  if (isolated || container === undefined || container.controller) return false;
  container.addEventListener('controllerchange', () => {
    if (!canReload()) return;
    void serverSendsIsolation().then((sends) => {
      if (!sends && canReload()) reload();
    });
  });
  return true;
};

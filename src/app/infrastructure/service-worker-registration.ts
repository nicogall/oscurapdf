export interface ServiceWorkerContainerLike {
  register(url: string, options?: RegistrationOptions): Promise<ServiceWorkerRegistration>;
}

/**
 * Registers the offline service worker (FR-029) once, in production builds only.
 * The worker caches only app and model assets, never document data.
 */
export class ServiceWorkerRegistrar {
  private attempted = false;

  constructor(
    private readonly mode: string,
    private readonly container: ServiceWorkerContainerLike | undefined,
    /** The app's base path: `/` locally, `/oscurapdf/` on GitHub Pages. */
    private readonly base = '/',
  ) {}

  async register(): Promise<boolean> {
    if (this.attempted || this.mode !== 'production' || this.container === undefined) return false;
    this.attempted = true;
    try {
      await this.container.register(`${this.base}sw.js`, { scope: this.base });
      return true;
    } catch {
      return false;
    }
  }
}

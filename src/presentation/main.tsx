import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { createAppServices } from '@app/composition-root';
import { reloadOnceForIsolation } from '@app/infrastructure/isolation-reload';
import { ServiceWorkerRegistrar } from '@app/infrastructure/service-worker-registration';
import { ServicesContext } from './app-context';
import { AppShell } from './app-shell';
import { createI18n, startLanguage, UI_LANGUAGES } from './i18n/i18n';
import './styles.css';

const bootstrap = async (): Promise<void> => {
  const services = createAppServices();
  const i18n = await createI18n(startLanguage(UI_LANGUAGES, services.preferences.readLanguage(), navigator.languages));
  document.documentElement.lang = i18n.language;
  i18n.on('languageChanged', (language) => {
    document.documentElement.lang = language;
  });
  void new ServiceWorkerRegistrar(import.meta.env.MODE, navigator.serviceWorker, import.meta.env.BASE_URL).register();
  reloadOnceForIsolation({
    container: import.meta.env.PROD ? navigator.serviceWorker : undefined,
    isolated: crossOriginIsolated,
    canReload: () => services.session.snapshot().kind === 'empty',
    // HEAD is not handled by the service worker: these are the real server headers.
    serverSendsIsolation: () =>
      fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
        .then((response) => response.headers.has('cross-origin-embedder-policy'))
        .catch(() => true),
    reload: () => {
      window.location.reload();
    },
  });
  const root = document.getElementById('root');
  if (root === null) return;
  createRoot(root).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <ServicesContext.Provider value={services}>
          <AppShell />
        </ServicesContext.Provider>
      </I18nextProvider>
    </StrictMode>,
  );
};

void bootstrap();

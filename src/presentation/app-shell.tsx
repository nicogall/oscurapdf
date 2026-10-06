import { useState, type DragEvent, type MouseEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@app/views';
import { BrandMark, Icon } from './icons';
import { UI_LANGUAGES } from './i18n/i18n';
import { LanguageSwitch } from './i18n/language-switch';
import { ScreenRouter } from './screen-router';
import { ReplaceDialog } from './screens/replace-dialog';
import { useServices } from './app-context';
import { CloseDocumentDialog } from './screens/close-document-dialog';
import { useDocumentOpener } from './use-document-opener';

interface AppShellProps {
  /** Offered UI languages; the switch appears only when there is more than one. */
  readonly languages?: readonly Language[];
}

/**
 * The logo leads to the start page: from the start page it scrolls to the top; with a document
 * open it asks first (like the X); from an error screen it goes straight back.
 */
const useHomeLink = () => {
  const { session } = useServices();
  const [confirming, setConfirming] = useState(false);
  const goHome = (event: MouseEvent) => {
    event.preventDefault();
    const kind = session.snapshot().kind;
    if (kind === 'reviewing') setConfirming(true);
    else if (kind === 'empty') window.scrollTo({ top: 0, behavior: 'smooth' });
    else void session.close();
  };
  return { goHome, confirming, cancel: () => { setConfirming(false); } };
};

const Header = ({ languages }: Required<AppShellProps>): ReactElement => {
  const { t } = useTranslation();
  const home = useHomeLink();
  return (
    <header className="app__header">
      <div className="app__header-inner">
        <a href={import.meta.env.BASE_URL} className="brand" title={t('app.home')} onClick={home.goHome}>
          <BrandMark />
          <span className="brand__name">{t('app.title')}</span>
        </a>
        {home.confirming && <CloseDocumentDialog onCancel={home.cancel} />}
        <span className="pill pill--ok">
          <Icon name="lock" className="icon icon--sm" />
          {t('app.badge')}
        </span>
        {languages.length > 1 && <LanguageSwitch languages={languages} />}
      </div>
    </header>
  );
};

/** Header, current screen, and document replacement with confirmation. */
export const AppShell = ({ languages = UI_LANGUAGES }: AppShellProps): ReactElement => {
  const opener = useDocumentOpener();
  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file !== undefined) opener.open(file);
  };

  return (
    <div
      className="app"
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={onDrop}
    >
      <Header languages={languages} />
      <main className="app__main">
        <ScreenRouter onFile={opener.open} />
      </main>
      {opener.pendingReplace && <ReplaceDialog onCancel={opener.cancelReplace} onConfirm={opener.confirmReplace} />}
    </div>
  );
};

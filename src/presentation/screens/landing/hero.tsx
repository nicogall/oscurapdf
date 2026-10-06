import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../../icons';
import { DropZone } from './drop-zone';

const STATS: ReadonlyArray<{ readonly key: string; readonly icon: IconName }> = [
  { key: 'bytes', icon: 'server' },
  { key: 'checks', icon: 'shield' },
  { key: 'removed', icon: 'check' },
];

/** Headline, the drop zone and the three privacy facts. */
export const Hero = ({ onFile }: { readonly onFile: (file: File) => void }): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="hero">
      <div className="container hero__inner">
        <p className="pill">{t('landing.eyebrow')}</p>
        <h1 className="hero__title">
          {t('landing.title')} <span className="hero__highlight">{t('landing.titleHighlight')}</span>
        </h1>
        <p className="hero__lead">{t('landing.lead')}</p>
        <DropZone onFile={onFile} />
        <p className="hero__privacy">
          <Icon name="lock" className="icon icon--sm" />
          {t('app.privacy')}
        </p>
        <ul className="stats">
          {STATS.map(({ key, icon }) => (
            <li key={key} className="stats__item">
              <Icon name={icon} />
              <span>
                <strong>{t(`landing.stats.${key}.value`)}</strong> {t(`landing.stats.${key}.label`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

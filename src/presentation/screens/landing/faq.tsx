import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '../../icons';

const QUESTIONS = ['upload', 'scans', 'misses', 'verify', 'free'] as const;

/** Frequently asked questions, as native disclosure widgets (keyboard accessible). */
export const Faq = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="section section--tinted" aria-labelledby="faq-title">
      <div className="container container--narrow">
        <h2 id="faq-title" className="section__title">{t('landing.faq.title')}</h2>
        <div className="faq">
          {QUESTIONS.map((key) => (
            <details key={key} className="faq__item">
              <summary>{t(`landing.faq.${key}.q`)}</summary>
              <p>{t(`landing.faq.${key}.a`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

const local = (file: string): string => `${import.meta.env.BASE_URL}${file}`;

/** Legal pages and what the AGPL asks the site to offer: its source (the public repository) and the licences of its parts. */
const FOOTER_LINKS = [
  { key: 'privacy', href: local('privacy.html') },
  { key: 'terms', href: local('condizioni.html') },
  { key: 'source', href: 'https://github.com/nicogall/oscurapdf' },
  { key: 'licenses', href: local('third-party-licenses.txt') },
] as const;

export const SiteFooter = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <span className="brand">
          <BrandMark />
          <span className="brand__name">{t('app.title')}</span>
        </span>
        <p>{t('landing.footer.privacy')}</p>
        <nav className="site-footer__links" aria-label={t('landing.footer.linksLabel')}>
          {FOOTER_LINKS.map(({ key, href }) => (
            <a key={key} href={href} rel="noreferrer">{t(`landing.footer.links.${key}`)}</a>
          ))}
        </nav>
      </div>
    </footer>
  );
};

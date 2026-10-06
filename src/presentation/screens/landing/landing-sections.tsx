import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../../icons';

const STEPS: ReadonlyArray<{ readonly key: string; readonly icon: IconName }> = [
  { key: 'open', icon: 'file' },
  { key: 'review', icon: 'eye' },
  { key: 'export', icon: 'shield' },
];

const DETECTS = ['names', 'taxCode', 'vat', 'iban', 'card', 'email', 'phone', 'address', 'ids', 'codes', 'cadastral', 'fields', 'websites', 'companies', 'plates'] as const;
const NOT_DETECTS = ['dates', 'health', 'signatures', 'scans'] as const;

/** Three numbered steps: open, review, export and verify. */
export const HowItWorks = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="section" aria-labelledby="how-title">
      <div className="container">
        <h2 id="how-title" className="section__title">{t('landing.steps.title')}</h2>
        <ol className="steps">
          {STEPS.map(({ key, icon }, index) => (
            <li key={key} className="card step">
              <span className="step__icon"><Icon name={icon} /></span>
              <span className="step__number">{index + 1}</span>
              <h3>{t(`landing.steps.${key}.title`)}</h3>
              <p>{t(`landing.steps.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

interface ChipListProps {
  readonly group: 'detects' | 'notDetects';
  readonly keys: readonly string[];
}

const ChipList = ({ group, keys }: ChipListProps): ReactElement => {
  const { t } = useTranslation();
  const icon: IconName = group === 'detects' ? 'check' : 'plus';
  return (
    <div className="finds__group">
      <h3 className="finds__title">{t(`landing.${group}.title`)}</h3>
      <p className="section__subtitle">{t(`landing.${group}.subtitle`)}</p>
      <ul className={`chips chips--${group}`}>
        {keys.map((key) => (
          <li key={key} className="chip"><Icon name={icon} className="icon icon--sm" />{t(`landing.${group}.${key}`)}</li>
        ))}
      </ul>
    </div>
  );
};

/** What automatic detection looks for, and what the user adds by hand. */
export const WhatItFinds = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="section section--tinted" aria-labelledby="finds-title">
      <div className="container">
        <h2 id="finds-title" className="section__title">{t('landing.finds')}</h2>
        <ChipList group="detects" keys={DETECTS} />
        <ChipList group="notDetects" keys={NOT_DETECTS} />
      </div>
    </section>
  );
};

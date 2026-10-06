import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingScreenProps {
  readonly onCancel: () => void;
  readonly stage?: 'read' | 'extract' | 'detect' | 'models';
  readonly fraction?: number;
}

/** Progress while the document is parsed (and later detected), with Cancel. */
export const LoadingScreen = ({ onCancel, stage = 'read', fraction }: LoadingScreenProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="loading" aria-live="polite">
      <h2>{t('loading.title')}</h2>
      <p>{t(`loading.stages.${stage}`)}</p>
      <progress aria-label={t(`loading.stages.${stage}`)} {...(fraction === undefined ? {} : { value: fraction, max: 1 })} />
      <button type="button" onClick={onCancel}>
        {t('loading.cancel')}
      </button>
    </section>
  );
};

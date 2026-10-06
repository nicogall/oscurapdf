import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { DetectionStatus as Status } from '@app/views';

/** Background detection progress, result count, and the degraded notice (constitution III). */
export const DetectionStatus = ({ status }: { status: Status }): ReactElement | null => {
  const { t } = useTranslation();
  switch (status.kind) {
    case 'idle':
      return null;
    case 'running':
      return status.stage === 'models' ? (
        // One-off download of the analysis tools (first use only): show how far it is.
        <div className="detection-status detection-status--preparing" aria-live="polite">
          <p>{t('detection.preparing', { percent: Math.round(status.fraction * 100) })}</p>
          <p className="hint">{t('detection.preparingHint')}</p>
          <progress aria-label={t('detection.stages.models')} value={status.fraction} max={1} />
        </div>
      ) : (
        <div className="detection-status" aria-live="polite">
          <p>{t('detection.running')}</p>
          <p className="hint">{t(`detection.stages.${status.stage === 'ner' ? 'ner' : 'rules'}`)}</p>
          <progress aria-label={t('detection.running')} value={status.fraction} max={1} />
        </div>
      );
    case 'done':
      return <p className="detection-status" aria-live="polite">{t('detection.done', { count: status.found })}</p>;
    case 'degraded':
      return <DegradedDetectionNotice />;
  }
};

export const DegradedDetectionNotice = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <p className="detection-status detection-status--degraded" role="status">
      ⚠ {t('detection.degraded')}
    </p>
  );
};

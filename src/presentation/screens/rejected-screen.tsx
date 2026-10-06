import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionState } from '@app/views';

type RejectionReason = Extract<SessionState, { kind: 'rejected' }>['reason'];

/** One plain-language message per refusal reason (FR-003, FR-003a, FR-004). */
export const RejectedScreen = ({ reason, onBack }: { reason: RejectionReason; onBack: () => void }): ReactElement => {
  const { t } = useTranslation();
  return (
    <section className="export-screen export-screen--failed">
      <p role="alert">{t(`rejected.${reason}`)}</p>
      <button type="button" className="primary" onClick={onBack} autoFocus>
        {t('rejected.back')}
      </button>
    </section>
  );
};

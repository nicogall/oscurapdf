import { useId, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmUnverifiedSave, type UnverifiedSaveAcknowledgement } from '@app/views';

interface AcknowledgeUnverifiedDialogProps {
  readonly onSave: (acknowledgement: UnverifiedSaveAcknowledgement) => void;
  readonly onCancel: () => void;
}

/** FR-026a: Save is enabled only after the checkbox is ticked; Cancel is the default. */
export const AcknowledgeUnverifiedDialog = ({ onSave, onCancel }: AcknowledgeUnverifiedDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [understood, setUnderstood] = useState(false);
  const checkboxId = useId();
  return (
    <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={`${checkboxId}-warning`}>
      <p id={`${checkboxId}-warning`}>⚠ {t('acknowledge.warning')}</p>
      <p>
        <input id={checkboxId} type="checkbox" checked={understood} onChange={(event) => { setUnderstood(event.target.checked); }} />
        <label htmlFor={checkboxId}>{t('acknowledge.checkbox')}</label>
      </p>
      <div className="dialog__actions">
        <button type="button" onClick={onCancel} autoFocus>
          {t('acknowledge.cancel')}
        </button>
        <button type="button" className="danger" disabled={!understood} onClick={() => { onSave(confirmUnverifiedSave()); }}>
          {t('acknowledge.save')}
        </button>
      </div>
    </div>
  );
};

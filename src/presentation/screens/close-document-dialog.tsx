import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useServices } from '../app-context';
import { ConfirmDialog } from '../confirm-dialog';

/** "Close this document?": keeping it is the default; closing releases it and shows the start page (FR-035). */
export const CloseDocumentDialog = ({ onCancel }: { readonly onCancel: () => void }): ReactElement => {
  const { t } = useTranslation();
  const { session } = useServices();
  return (
    <ConfirmDialog
      message={t('close.confirm')}
      confirmLabel={t('close.yes')}
      cancelLabel={t('close.no')}
      onConfirm={() => {
        onCancel();
        void session.close();
      }}
      onCancel={onCancel}
    />
  );
};

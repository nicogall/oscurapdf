import type { ReactElement } from 'react';
import type { DocumentWorkspace, ExportState } from '@app/views';
import { AcknowledgeUnverifiedDialog } from './acknowledge-unverified-dialog';
import { ExportFailedScreen } from './export-failed-screen';
import { ExportingScreen } from './exporting-screen';
import { VerificationFailedScreen } from './verification-failed-screen';
import { VerifiedScreen } from './verified-screen';

interface ExportScreensProps {
  readonly state: Exclude<ExportState, { kind: 'idle' }>;
  readonly flow: DocumentWorkspace['exportFlow'];
}

/** Routes the export states of contracts/ui-contract.md to their screens. */
export const ExportScreens = ({ state, flow }: ExportScreensProps): ReactElement => {
  const back = () => {
    flow.backToReview();
  };
  switch (state.kind) {
    case 'exporting':
      return <ExportingScreen fraction={state.fraction} />;
    case 'exportFailed':
      return <ExportFailedScreen onBack={back} />;
    case 'verified':
      return <VerifiedScreen report={state.report} onSave={() => void flow.save()} onBack={back} />;
    case 'verificationFailed':
      return <VerificationFailedScreen report={state.report} onBack={back} onSaveAnyway={() => { flow.requestUnverifiedSave(); }} />;
    case 'acknowledgeUnverified':
      return (
        <>
          <VerificationFailedScreen report={state.report} onBack={back} onSaveAnyway={() => undefined} />
          <AcknowledgeUnverifiedDialog onSave={(ack) => void flow.save(ack)} onCancel={() => { flow.cancelUnverifiedSave(); }} />
        </>
      );
  }
};

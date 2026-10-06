import type { ReactElement } from 'react';
import { useServices, useSessionState } from './app-context';
import { EmptyScreen } from './screens/empty-screen';
import { ImageOnlyScreen } from './screens/image-only-screen';
import { LoadingScreen } from './screens/loading-screen';
import { RejectedScreen } from './screens/rejected-screen';
import { ReviewingScreen } from './screens/reviewing-screen';

interface ScreenRouterProps {
  readonly onFile: (file: File) => void;
}

/** Picks the screen for the current session state (contracts/ui-contract.md). */
export const ScreenRouter = ({ onFile }: ScreenRouterProps): ReactElement | null => {
  const { session } = useServices();
  const state = useSessionState();
  const close = () => void session.close();
  switch (state.kind) {
    case 'empty':
      return <EmptyScreen onFile={onFile} />;
    case 'loading':
      return <LoadingScreen onCancel={close} />;
    case 'reviewing':
      return <ReviewingScreen state={state} />;
    case 'rejected':
      return <RejectedScreen reason={state.reason} onBack={close} />;
    case 'imageOnly':
      return <ImageOnlyScreen onBack={close} />;
  }
};

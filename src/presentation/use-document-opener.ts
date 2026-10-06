import { useState } from 'react';
import { useServices } from './app-context';
import { fromFile } from './file-handle';

export interface DocumentOpener {
  readonly open: (file: File) => void;
  readonly pendingReplace: boolean;
  readonly confirmReplace: () => void;
  readonly cancelReplace: () => void;
}

/** Opens a file; if a document is already open, holds it until the user confirms replacement. */
export const useDocumentOpener = (): DocumentOpener => {
  const { session } = useServices();
  const [pending, setPending] = useState<File | undefined>(undefined);
  return {
    open: (file) => {
      void session.load(fromFile(file)).then((result) => {
        if (!result.ok) setPending(file);
      });
    },
    pendingReplace: pending !== undefined,
    confirmReplace: () => {
      if (pending !== undefined) void session.replace(fromFile(pending));
      setPending(undefined);
    },
    cancelReplace: () => {
      setPending(undefined);
    },
  };
};

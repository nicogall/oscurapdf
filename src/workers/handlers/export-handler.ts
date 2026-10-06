import { fromWirePlan, type WirePlan } from '@shared-kernel/published';
import type { RedactionWriter } from '@engine';
import { HandlerError, type Handler } from '../protocol';

/** Applies a plan with the writer (document worker) and transfers the output bytes. */
export const createExportHandler =
  (writer: RedactionWriter): Handler =>
  async (payload, context) => {
    const result = await writer.write(fromWirePlan(payload as WirePlan), (stage, fraction) => {
      context.progress(stage, fraction);
    });
    if (!result.ok) throw new HandlerError(result.error);
    context.transfer(result.value.output.buffer);
    return result.value;
  };

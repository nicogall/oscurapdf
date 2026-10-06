import type { RedactionPlan } from '@shared-kernel/published';
import { geometryCheck } from '../domain/checks/geometry-check';
import { imagePixelCheck } from '../domain/checks/image-pixel-check';
import { sideChannelCheck } from '../domain/checks/side-channel-check';
import { singleRevisionCheck } from '../domain/checks/single-revision-check';
import { textAbsentCheck } from '../domain/checks/text-absent-check';
import { validPdfCheck } from '../domain/checks/valid-pdf-check';
import { buildReport } from '../domain/outcome-rule';
import { checkFrom, type CheckKind, type VerificationCheck } from '../domain/verification-check';
import type { VerificationReport } from '../domain/verification-report';
import type { IndependentPdfParser, ParsedPdf } from './ports/independent-pdf-parser';
import type { Inspection, RedactionInspector } from './ports/redaction-inspector';

export interface VerificationInput {
  readonly output: Uint8Array;
  readonly plan: RedactionPlan;
  readonly inputPageCount: number;
  readonly itemsRemoved: number;
}

const DEPENDENT_CHECKS: readonly CheckKind[] = ['textAbsent', 'geometry', 'sideChannels', 'imagePixels', 'singleRevision'];

/** When an engine cannot even parse the output, nothing can be verified: every check fails. */
const unverifiable = (): VerificationCheck[] => DEPENDENT_CHECKS.map((kind) => checkFrom(kind, [{}]));

const contentChecks = (parsed: ParsedPdf, inspection: Inspection, plan: RedactionPlan): VerificationCheck[] => [
  textAbsentCheck([parsed.pageTexts, inspection.pageTexts], plan.redactedTexts),
  geometryCheck(inspection.glyphs, plan.areasByPage),
  sideChannelCheck(inspection.sideChannelValues, plan.redactedTexts),
  imagePixelCheck(inspection.imageSamples),
  singleRevisionCheck(inspection.revisionCount),
];

/** Re-opens the output with two engines and runs the six checks (research R5). */
export class VerifyRedaction {
  constructor(
    private readonly parser: IndependentPdfParser,
    private readonly inspector: RedactionInspector,
  ) {}

  async execute({ output, plan, inputPageCount, itemsRemoved }: VerificationInput): Promise<VerificationReport> {
    const [parsed, inspected] = await Promise.all([
      this.parser.parse(output.slice()),
      this.inspector.inspect(output.slice(), plan),
    ]);
    const valid = validPdfCheck({
      expectedPageCount: inputPageCount,
      ...(parsed.ok ? { independentPageCount: parsed.value.pageCount } : {}),
      ...(inspected.ok ? { inspectorPageCount: inspected.value.pageCount } : {}),
    });
    const rest = parsed.ok && inspected.ok ? contentChecks(parsed.value, inspected.value, plan) : unverifiable();
    return buildReport(itemsRemoved, [valid, ...rest]);
  }
}

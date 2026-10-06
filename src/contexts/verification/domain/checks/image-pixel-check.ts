import { checkFrom, type VerificationCheck } from '../verification-check';

export interface ImageSample {
  readonly page: number;
  /** True when every pixel of the image under the area has the same colour (the black fill). */
  readonly uniform: boolean;
}

/** Image pixels under every redaction area were replaced, not just covered. */
export const imagePixelCheck = (samples: readonly ImageSample[]): VerificationCheck =>
  checkFrom(
    'imagePixels',
    samples.filter((sample) => !sample.uniform).map(({ page }) => ({ page })),
  );

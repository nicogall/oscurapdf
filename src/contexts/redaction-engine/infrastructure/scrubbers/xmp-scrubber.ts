import { scrubValue } from '../../domain/side-channel-policy';
import type { SideChannelScrubber } from './scrubber';

/** XMP metadata stream of the catalog. */
export const scrubXmp: SideChannelScrubber = (doc, redactedTexts) => {
  const metadata = doc.getTrailer().get('Root').get('Metadata');
  if (!metadata.isStream()) return { channel: 'xmp', count: 0 };
  const scrubbed = scrubValue(metadata.readStream().asString(), redactedTexts);
  if (scrubbed.removed > 0) metadata.writeStream(new TextEncoder().encode(scrubbed.value));
  return { channel: 'xmp', count: scrubbed.removed };
};

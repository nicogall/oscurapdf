import { scrubValue } from '../../domain/side-channel-policy';
import type { SideChannelScrubber } from './scrubber';

/** Document properties (Author, Title, Keywords, …): deletes redacted text, keeps the rest. */
export const scrubInfoDictionary: SideChannelScrubber = (doc, redactedTexts) => {
  const info = doc.getTrailer().get('Info');
  let count = 0;
  if (!info.isDictionary()) return { channel: 'infoDictionary', count };
  const updates: Array<[string | number, string]> = [];
  info.forEach((value, key) => {
    if (!value.isString()) return;
    const scrubbed = scrubValue(value.asString(), redactedTexts);
    if (scrubbed.removed > 0) updates.push([key, scrubbed.value]);
    count += scrubbed.removed;
  });
  for (const [key, value] of updates) info.put(key, doc.newString(value));
  return { channel: 'infoDictionary', count };
};

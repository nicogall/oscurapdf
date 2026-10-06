import type { Page } from '@playwright/test';

/**
 * Selects document text in the text layer from the first occurrence of `from` to the end of the
 * following occurrence of `to` (which may be in a later span/line), like a mouse drag would.
 */
export const selectText = async (page: Page, from: string, to: string = from): Promise<void> => {
  await page.locator('[data-char-start]', { hasText: from }).first().waitFor();
  await page.evaluate(
    ({ from: start, to: end }) => {
      const nodes = [...document.querySelectorAll('[data-char-start]')].map((span) => span.firstChild).filter((n): n is Text => n instanceof Text);
      const startIndex = nodes.findIndex((node) => node.data.includes(start));
      const startNode = nodes[startIndex];
      if (startNode === undefined) throw new Error(`"${start}" not in text layer`);
      const startOffset = startNode.data.indexOf(start);
      const endNode = nodes.slice(startIndex).find((node, i) => node.data.indexOf(end, i === 0 ? startOffset : 0) >= 0);
      if (endNode === undefined) throw new Error(`"${end}" not after "${start}"`);
      const endOffset = endNode.data.indexOf(end, endNode === startNode ? startOffset : 0) + end.length;
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    },
    { from, to },
  );
};

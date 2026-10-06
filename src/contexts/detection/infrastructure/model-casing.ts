const ALL_CAPS_WORD = /(?<![\p{L}\p{N}])(\p{Lu})(\p{Lu}+)(?![\p{L}\p{N}])/gu;

/**
 * The NER model is case-sensitive and was trained on ordinary prose: "ROSSI MARIO" in a form reads
 * as an organization. Words in capitals are shown to the model in title case ("Rossi Mario").
 * Only same-length rewrites are made, so every character offset stays valid.
 */
export const toModelCasing = (text: string): string =>
  text.replace(ALL_CAPS_WORD, (word: string, first: string, rest: string) => {
    const titled = first + rest.toLowerCase();
    return titled.length === word.length ? titled : word;
  });

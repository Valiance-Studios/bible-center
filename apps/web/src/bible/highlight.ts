export interface TextPart {
  text: string;
  isMatch: boolean;
}

/** Common words that would scatter highlights across a verse without helping anyone find their phrase. */
const IGNORED_WORDS = new Set(['the', 'and', 'for', 'not', 'but', 'you', 'his', 'her', 'are', 'was', 'that', 'with', 'nor', 'any', 'all']);
const MIN_WORD_LENGTH = 3;

function escapeForRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Splits a verse around whole-word matches of these words, ignoring case. */
export function highlightWords(text: string, words: readonly string[]): TextPart[] {
  const wanted = words.filter((word) => word.length >= MIN_WORD_LENGTH && !IGNORED_WORDS.has(word.toLowerCase()));

  if (wanted.length === 0) {
    return [{text, isMatch: false}];
  }

  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${wanted.map(escapeForRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'giu');

  // Splitting on a capturing group puts each match at an odd position.
  return text.split(pattern)
    .map((part, index) => ({text: part, isMatch: index % 2 === 1}))
    .filter((part) => part.text.length > 0);
}

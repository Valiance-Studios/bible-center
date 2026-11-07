import {describe, expect, it} from 'vitest';
import {highlightWords} from '@/bible/highlight';

function matched(text: string, words: string[]): string[] {
  return highlightWords(text, words).filter((part) => part.isMatch).map((part) => part.text);
}

describe('highlightWords', () => {
  it('keeps the whole text in order', () => {
    const parts = highlightWords('The old stone mill.', ['stone']);

    expect(parts.map((part) => part.text).join('')).toBe('The old stone mill.');
    expect(matched('The old stone mill.', ['stone'])).toEqual(['stone']);
  });

  it('ignores case and keeps the text\'s own casing', () => {
    expect(matched('Stone by stone.', ['stone'])).toEqual(['Stone', 'stone']);
  });

  it('only matches whole words', () => {
    expect(matched('A stones throw, a milestone, a stone.', ['stone'])).toEqual(['stone']);
  });

  it('skips short and very common words', () => {
    expect(matched('It is the river and the mill.', ['it', 'the', 'and', 'river'])).toEqual(['river']);
  });

  it('returns the text unmarked when nothing qualifies', () => {
    expect(highlightWords('The river.', ['the'])).toEqual([{text: 'The river.', isMatch: false}]);
    expect(highlightWords('The river.', [])).toEqual([{text: 'The river.', isMatch: false}]);
  });

  it('treats special characters as plain text', () => {
    expect(matched('Cost (exact) and abc here.', ['(exact)', 'a.c'])).toEqual(['(exact)']);
  });
});

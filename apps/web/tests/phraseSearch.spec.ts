import type {SearchableVerse} from '@bible-center/core';

import {describe, expect, it} from 'vitest';
import {buildPhraseIndex} from '@/bible/phraseSearch';

// Invented text, as test fixtures must never hold copyrighted translations.
const VERSES: SearchableVerse[] = [
  ['genesis', 1, 1, 'The river runs quietly past the old stone mill.'],
  ['genesis', 1, 2, 'A quiet river and an old stone bridge stand in the valley.'],
  ['exodus', 2, 3, 'Stone by stone the walls rose over many long years.'],
  ['psalms', 4, 5, 'Morning light fell gently across the river valley.'],
];

const locationOf = ({slug, chapter, verse}: {slug: string; chapter: number; verse: number}) => `${slug} ${chapter}:${verse}`;

describe('buildPhraseIndex', () => {
  const index = buildPhraseIndex(VERSES);

  it('puts a verse with the exact wording first', () => {
    expect(locationOf(index.search('old stone mill')[0]!)).toBe('genesis 1:1');
    expect(locationOf(index.search('the old stone bridge')[0]!)).toBe('genesis 1:2');
  });

  it('ignores case and punctuation', () => {
    expect(locationOf(index.search('"MORNING light, fell!"')[0]!)).toBe('psalms 4:5');
  });

  it('tolerates a typo', () => {
    expect(locationOf(index.search('mornng light')[0]!)).toBe('psalms 4:5');
  });

  it('finds a verse from loosely remembered wording', () => {
    expect(locationOf(index.search('walls rising over the years')[0]!)).toBe('exodus 2:3');
  });

  it('reports the matched words, for highlighting', () => {
    expect(index.search('morning light')[0]?.matchedWords).toEqual(expect.arrayContaining(['morning', 'light']));
  });

  it('finds nothing for an empty search or unknown words', () => {
    expect(index.search('')).toEqual([]);
    expect(index.search('  ,.  ')).toEqual([]);
    expect(index.search('xylophone')).toEqual([]);
  });

  it('only matches short words exactly', () => {
    expect(index.search('olf')).toEqual([]);
    expect(index.search('sto')).toEqual([]);
  });

  it('does not count a verse holding too few of the words', () => {
    expect(index.search('the xylophone zebra quartz')).toEqual([]);
  });

  it('limits how many results it returns', () => {
    const many: SearchableVerse[] = Array.from({length: 50}, (_, verse) => ['genesis', 1, verse + 1, 'The same river.']);

    expect(buildPhraseIndex(many).search('river')).toHaveLength(20);
  });
});

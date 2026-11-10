import type {MemoryVerse} from '../src/memorize';

import {describe, expect, it} from 'vitest';
import {fadeWords, groupMemoryVerses, isDueForReview} from '../src/memorize';

const NOW = new Date('2026-11-10T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

function verse(startVerse: string, status: MemoryVerse['status'], addedDaysAgo: number, practicedDaysAgo: number): MemoryVerse {
  return {startVerse, endVerse: startVerse, status, createdAt: daysAgo(addedDaysAgo), practicedAt: daysAgo(practicedDaysAgo)};
}

describe('isDueForReview', () => {
  it('brings a memorized verse back a week after it was practiced', () => {
    expect(isDueForReview({status: 'memorized', practicedAt: daysAgo(7)}, NOW)).toBe(true);
    expect(isDueForReview({status: 'memorized', practicedAt: daysAgo(6)}, NOW)).toBe(false);
    expect(isDueForReview({status: 'learning', practicedAt: daysAgo(30)}, NOW)).toBe(false);
  });
});

describe('groupMemoryVerses', () => {
  it('lists due verses longest-waiting first, then learning newest first, then memorized, leaving out empty sections', () => {
    const list = [
      verse('19023001', 'learning', 5, 1),
      verse('43003016', 'memorized', 20, 3),
      verse('45008028', 'memorized', 30, 9),
      verse('20003005', 'memorized', 40, 12),
      verse('50004006', 'learning', 2, 2),
    ];

    expect(groupMemoryVerses(list, NOW).map(({group, verses}) => [group, verses.map(({startVerse}) => startVerse)])).toEqual([
      ['due', ['20003005', '45008028']],
      ['learning', ['50004006', '19023001']],
      ['memorized', ['43003016']],
    ]);
    expect(groupMemoryVerses([verse('19023001', 'learning', 1, 1)], NOW).map(({group}) => group)).toEqual(['learning']);
  });
});

describe('fadeWords', () => {
  const text = '“Be still, and know that I am God.”';

  it('shows every word at the first step, keeping punctuation apart', () => {
    const words = fadeWords(text, 0);

    expect(words.map(({before, word, after}) => [before, word, after])[0]).toEqual(['“', 'Be', '']);
    expect(words[1]).toMatchObject({word: 'still', after: ',', isHidden: false});
    expect(words.at(-1)).toMatchObject({word: 'God', after: '.”'});
    expect(words.some(({isHidden}) => isHidden)).toBe(false);
  });

  it('hides one word in three, then two in three', () => {
    expect(fadeWords(text, 1).map(({isHidden}) => isHidden)).toEqual([false, true, false, false, true, false, false, true]);
    expect(fadeWords(text, 2).map(({isHidden}) => isHidden)).toEqual([false, true, true, false, true, true, false, true]);
  });

  it('leaves first letters, then nothing', () => {
    expect(fadeWords(text, 3).map(({hint}) => hint).join(' ')).toBe('B s a k t I a G');
    expect(fadeWords(text, 4).every(({isHidden, hint}) => isHidden && hint === '')).toBe(true);
  });

  it('never hides a token that is only punctuation', () => {
    expect(fadeWords('bread to eat — for He gives', 4)[3]).toMatchObject({before: '—', word: '', isHidden: false});
  });
});

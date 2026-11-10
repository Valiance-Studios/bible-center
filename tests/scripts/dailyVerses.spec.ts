import type {DailyVerseList} from '../../packages/core/src/dailyVerses.ts';
import type {TopicFile} from '../../packages/core/src/topics.ts';
import type {PassageText} from '../../scripts/build-daily-verses';

import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {DAILY_VERSE_COUNT} from '../../packages/core/src/dailyVerses.ts';
import {parseVerseId} from '../../packages/core/src/verseId.ts';
import {chooseDailyVerses} from '../../scripts/build-daily-verses';

/** Invented text, keyed by verse id, standing in for the BSB. */
const TEXT: Record<string, string> = {
  '43003016': 'Short and whole.',
  '43003017': 'Another whole sentence.',
  '45008028': 'A third one.',
  '45008029': 'and a fragment that continues',
  '50004013': `${'Far too long. '.repeat(20)}`,
  '19023001': 'A Psalm of David. A title runs into the first verse.',
  '19023004': '“An opened quotation.',
  '03020013': 'Left out by hand.',
  '19046010': 'Be still.',
};

const textOf: PassageText = (startVerse, endVerse) => {
  const ids = Object.keys(TEXT).filter((id) => id >= startVerse && id <= endVerse);

  return ids.length > 0 ? ids.map((id) => TEXT[id]).join(' ') : null;
};

function topic(verses: TopicFile['verses']): TopicFile {
  return {name: 'hope', verses};
}

describe('chooseDailyVerses', () => {
  it('adds up votes across topics and keeps the most-voted of overlapping passages', () => {
    const list = chooseDailyVerses([
      topic([['43003016', '43003016', 5], ['43003016', '43003017', 8]]),
      topic([['43003016', '43003016', 6], ['45008028', '45008028', 1]]),
    ], textOf, 2);

    expect(new Set(list.map(([start, end]) => `${start}-${end}`))).toEqual(new Set(['43003016-43003016', '45008028-45008028']));
  });

  it('leaves out fragments, long passages, psalm titles, open quotations and excluded passages', () => {
    const list = chooseDailyVerses([topic([
      ['45008029', '45008029', 100],
      ['50004013', '50004013', 100],
      ['19023001', '19023001', 100],
      ['19023004', '19023004', 100],
      ['03020013', '03020013', 100],
      ['43003016', '43003019', 100],
      ['19046010', '19046010', 1],
    ])], textOf, 1);

    expect(list).toEqual([['19046010', '19046010']]);
  });

  it('refuses to write a list that is too short', () => {
    expect(() => chooseDailyVerses([topic([['19046010', '19046010', 1]])], textOf, 2)).toThrow('Only 1 passages qualified');
  });

  it('gives the same order every time', () => {
    const topics = [topic([['43003016', '43003016', 3], ['45008028', '45008028', 2], ['19046010', '19046010', 1]])];

    expect(chooseDailyVerses(topics, textOf, 3)).toEqual(chooseDailyVerses(topics, textOf, 3));
  });
});

describe('the committed list', () => {
  const list = JSON.parse(readFileSync(new URL('../../apps/web/public/daily-verses.json', import.meta.url), 'utf8')) as DailyVerseList;

  it('has a valid passage within one chapter for every day of a leap year', () => {
    expect(list).toHaveLength(DAILY_VERSE_COUNT);

    for (const [startVerse, endVerse] of list) {
      expect(parseVerseId(startVerse)).not.toBeNull();
      expect(startVerse.slice(0, 5)).toBe(endVerse.slice(0, 5));
      expect(startVerse <= endVerse).toBe(true);
    }
  });
});

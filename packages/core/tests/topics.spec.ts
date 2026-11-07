import type {TopicFileVerse} from '../src/topics';

import {describe, expect, it} from 'vitest';
import {normalizeTopicName, rankTopicVerses, topicSlug, topicVerseKey} from '../src/topics';

describe('topic names', () => {
  it('normalizes case and spacing', () => {
    expect(normalizeTopicName('  Gain  the World ')).toBe('gain the world');
  });

  it('makes a slug of letters, digits and single hyphens', () => {
    expect(topicSlug('Self Control')).toBe('self-control');
    expect(topicSlug('self-control')).toBe('self-control');
    expect(topicSlug('10 commandments')).toBe('10-commandments');
    expect(topicSlug(' "Christ" & the church! ')).toBe('christ-the-church');
  });
});

describe('topicVerseKey', () => {
  it('is the verse id for one verse, and both ids for a passage', () => {
    expect(topicVerseKey('40005004', '40005004')).toBe('40005004');
    expect(topicVerseKey('46013004', '46013007')).toBe('46013004-46013007');
  });
});

describe('rankTopicVerses', () => {
  const verses: TopicFileVerse[] = [
    ['40005004', '40005004', 300],
    ['19147003', '19147003', 250],
    ['43011035', '43011035', 30],
  ];

  it('follows OpenBible without any upvotes', () => {
    expect(rankTopicVerses(verses, new Map()).map(({startVerse}) => startVerse)).toEqual(['40005004', '19147003', '43011035']);
  });

  it('lets upvotes overtake OpenBible votes', () => {
    const ranked = rankTopicVerses(verses, new Map([['43011035', 15]]));

    expect(ranked[0]).toMatchObject({startVerse: '43011035', upvotes: 15, openBibleVotes: 30});
    expect(ranked[1]?.startVerse).toBe('40005004');
  });

  it('breaks ties by OpenBible votes, then Bible order', () => {
    const tied: TopicFileVerse[] = [['43001002', '43001002', 0], ['43001001', '43001001', 0]];

    expect(rankTopicVerses(tied, new Map()).map(({startVerse}) => startVerse)).toEqual(['43001001', '43001002']);
  });
});

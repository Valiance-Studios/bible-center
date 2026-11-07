import type {OpenReport} from '../src/review';

import {describe, expect, it} from 'vitest';
import {groupReports, parseTopicVerseKey} from '../src/review';

function report(id: string, topic: string, verseKey: string, day: number): OpenReport {
  return {id, topic, verseKey, reason: 'fit', createdAt: new Date(2026, 10, day)};
}

describe('groupReports', () => {
  it('groups by topic and verse, oldest report first in each and oldest group first', () => {
    const groups = groupReports([
      report('c', 'grief', '19034008', 6),
      report('b', 'marriage', '40022030', 6),
      report('a', 'marriage', '40022030', 5),
      report('d', 'grief', '40022030', 7),
    ]);

    expect(groups.map(({topic, verseKey, reports}) => [topic, verseKey, reports.map(({id}) => id)])).toEqual([
      ['marriage', '40022030', ['a', 'b']],
      ['grief', '19034008', ['c']],
      ['grief', '40022030', ['d']],
    ]);
  });
});

describe('parseTopicVerseKey', () => {
  it('reads a verse or a passage, and rejects anything else', () => {
    expect(parseTopicVerseKey('19034008')).toEqual({startVerse: '19034008', endVerse: '19034008'});
    expect(parseTopicVerseKey('46013004-46013007')).toEqual({startVerse: '46013004', endVerse: '46013007'});
    expect(parseTopicVerseKey('nonsense')).toBeNull();
  });
});

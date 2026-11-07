import {describe, expect, it} from 'vitest';
import {chapterIdOf, referenceOf, selectVerse, spanContains, spanOf, spansOverlap, verseIdIn} from '../src/annotations';
import {parseChapterRef} from '../src/bibleBooks';

const JOHN_3 = parseChapterRef('john', '3')!;

describe('verse and chapter ids', () => {
  it('uses the canonical bbcccvvv format', () => {
    expect(verseIdIn(JOHN_3, 16)).toBe('43003016');
    expect(chapterIdOf(JOHN_3)).toBe('43003');
  });

  it('reads a span back from verse ids', () => {
    expect(spanOf({startVerse: '43003016', endVerse: '43003018'})).toEqual({start: 16, end: 18});
  });
});

describe('spans', () => {
  it('contains its own ends and what is between them', () => {
    expect(spanContains({start: 2, end: 4}, 2)).toBe(true);
    expect(spanContains({start: 2, end: 4}, 4)).toBe(true);
    expect(spanContains({start: 2, end: 4}, 5)).toBe(false);
  });

  it('overlaps when any verse is shared', () => {
    expect(spansOverlap({start: 1, end: 3}, {start: 3, end: 5})).toBe(true);
    expect(spansOverlap({start: 2, end: 3}, {start: 1, end: 9})).toBe(true);
    expect(spansOverlap({start: 1, end: 2}, {start: 3, end: 4})).toBe(false);
  });
});

describe('selectVerse', () => {
  it('selects the first verse tapped', () => {
    expect(selectVerse(null, 5)).toEqual({start: 5, end: 5});
  });

  it('clears when the same verse is tapped again', () => {
    expect(selectVerse({start: 5, end: 5}, 5)).toBeNull();
  });

  it('makes a range in either direction', () => {
    expect(selectVerse({start: 5, end: 5}, 8)).toEqual({start: 5, end: 8});
    expect(selectVerse({start: 5, end: 5}, 2)).toEqual({start: 2, end: 5});
  });

  it('starts over when tapping after a range', () => {
    expect(selectVerse({start: 5, end: 8}, 6)).toEqual({start: 6, end: 6});
  });
});

describe('referenceOf', () => {
  it('names the book, chapter and verses of a span', () => {
    expect(referenceOf({startVerse: '43001001', endVerse: '43001003'})).toEqual({
      book: JOHN_3.book, startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 3,
    });
  });

  it('is null for malformed verse ids', () => {
    expect(referenceOf({startVerse: 'nonsense', endVerse: '43001003'})).toBeNull();
    expect(referenceOf({startVerse: '67001001', endVerse: '67001001'})).toBeNull();
  });
});

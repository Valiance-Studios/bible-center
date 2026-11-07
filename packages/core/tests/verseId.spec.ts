import {describe, expect, it} from 'vitest';
import {formatVerseId, parseVerseId} from '../src/verseId';

describe('formatVerseId', () => {
  it('pads each part to the bbcccvvv format', () => {
    expect(formatVerseId({book: 43, chapter: 1, verse: 1})).toBe('43001001');
    expect(formatVerseId({book: 1, chapter: 2, verse: 24})).toBe('01002024');
  });

  it.each([
    {book: 0, chapter: 1, verse: 1},
    {book: 67, chapter: 1, verse: 1},
    {book: 1, chapter: 0, verse: 1},
    {book: 1, chapter: 1, verse: 0},
    {book: 1.5, chapter: 1, verse: 1},
  ])('rejects %j', (location) => {
    expect(() => formatVerseId(location)).toThrow(RangeError);
  });
});

describe('parseVerseId', () => {
  it('reverses formatVerseId', () => {
    const location = {book: 66, chapter: 22, verse: 13};

    expect(parseVerseId(formatVerseId(location))).toEqual(location);
  });

  it.each(['', '1001001', '430010011', '67001001', '00001001', '01000001', 'abcdefgh'])('returns null for "%s"', (id) => {
    expect(parseVerseId(id)).toBeNull();
  });
});

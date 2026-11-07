import {describe, expect, it} from 'vitest';
import {BIBLE_BOOKS, chapterTitle, nextChapter, parseChapterRef, previousChapter} from '../src/bibleBooks';

function ref(slug: string, chapter: string) {
  const parsed = parseChapterRef(slug, chapter);

  if (!parsed) {
    throw new Error(`${slug} ${chapter} should exist`);
  }

  return parsed;
}

describe('BIBLE_BOOKS', () => {
  it('holds 66 books and 1,189 chapters', () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(BIBLE_BOOKS.reduce((total, book) => total + book.chapters, 0)).toBe(1189);
  });

  it('gives each book a chapter count and URL slug', () => {
    expect(BIBLE_BOOKS.find((book) => book.name === 'Psalms')).toMatchObject({chapters: 150, slug: 'psalms', section: 'Wisdom'});
    expect(BIBLE_BOOKS.find((book) => book.name === 'Song of Solomon')?.slug).toBe('song-of-solomon');
    expect(BIBLE_BOOKS.at(-1)).toMatchObject({name: 'Revelation', chapters: 22});
  });
});

describe('parseChapterRef', () => {
  it('finds a chapter that exists', () => {
    expect(ref('1-john', '5').book.name).toBe('1 John');
  });

  it.each([
    ['no-such-book', '1'],
    ['genesis', '0'],
    ['genesis', '51'],
    ['genesis', '1.5'],
    ['genesis', '01'],
    ['genesis', 'one'],
    [undefined, '1'],
    ['genesis', undefined],
  ])('rejects %s %s', (slug, chapter) => {
    expect(parseChapterRef(slug, chapter)).toBeNull();
  });
});

describe('moving between chapters', () => {
  it('stays in the book when it can', () => {
    expect(nextChapter(ref('john', '1'))).toEqual(ref('john', '2'));
    expect(previousChapter(ref('john', '2'))).toEqual(ref('john', '1'));
  });

  it('crosses into the next and previous book', () => {
    expect(nextChapter(ref('genesis', '50'))).toEqual(ref('exodus', '1'));
    expect(previousChapter(ref('exodus', '1'))).toEqual(ref('genesis', '50'));
  });

  it('stops at both ends of the Bible', () => {
    expect(previousChapter(ref('genesis', '1'))).toBeNull();
    expect(nextChapter(ref('revelation', '22'))).toBeNull();
  });
});

describe('chapterTitle', () => {
  it('calls one of the Psalms a Psalm', () => {
    expect(chapterTitle(ref('psalms', '23'))).toBe('Psalm 23');
    expect(chapterTitle(ref('john', '3'))).toBe('John 3');
  });
});

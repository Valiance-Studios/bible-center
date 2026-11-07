import type {ChapterText, SearchableVerse} from '../../packages/core/src/bibleBooks.ts';

import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {BIBLE_BOOKS} from '../../packages/core/src/bibleBooks.ts';
import {findMissingChapters, parseSource} from '../../scripts/build-bible-data';

function readChapter(translation: string, book: string, chapter: number): ChapterText {
  return JSON.parse(readFileSync(`apps/web/public/bible/${translation}/${book}/${chapter}.json`, 'utf8')) as ChapterText;
}

function allVerses(translation: string): string[] {
  return BIBLE_BOOKS.flatMap((book) => Array.from({length: book.chapters}, (_, index) => readChapter(translation, book.slug, index + 1)))
    .flatMap(({verses}) => verses.map(({text}) => text));
}

describe('parseSource', () => {
  const identity = (text: string) => text;

  it('reads verse lines, skipping headers, and handles Windows line endings', () => {
    const chapters = parseSource('﻿A title line\r\nVerse\tBible\r\nExample 1:1\tFirst.\r\nExample 1:2\tSecond.\r\nExample 2:1\tThird.\r\n', identity);

    expect(chapters.get('Example 1')?.verses).toEqual([{verse: 1, text: 'First.'}, {verse: 2, text: 'Second.'}]);
    expect(chapters.get('Example 2')?.verses).toEqual([{verse: 1, text: 'Third.'}]);
  });

  it('calls the book of Psalms by its plural, and handles numbered books', () => {
    const chapters = parseSource('Psalm 3:1\tA.\n1 John 2:1\tB.\n', identity);

    expect([...chapters.keys()]).toEqual(['Psalms 3', '1 John 2']);
  });

  it('leaves out a verse the translation omits, keeping the others\' numbers', () => {
    const chapters = parseSource('Example 1:1\tFirst.\nExample 1:2\t\nExample 1:3\tThird.\n', identity);

    expect(chapters.get('Example 1')?.verses.map(({verse}) => verse)).toEqual([1, 3]);
  });

  it('applies the source\'s cleanup', () => {
    const chapters = parseSource('Example 1:1\tOne [two] three.\n', (text) => text.replaceAll(/[[\]]/g, ''));

    expect(chapters.get('Example 1')?.verses[0]?.text).toBe('One two three.');
  });
});

describe('findMissingChapters', () => {
  it('reports what a source lacks', () => {
    const missing = findMissingChapters(new Map());

    expect(missing).toHaveLength(1189);
    expect(missing[0]).toBe('Genesis 1');
  });
});

describe('the committed Bible data', () => {
  it.each(['bsb', 'kjv'])('%s has every chapter, each with text', (translation) => {
    expect(allVerses(translation).length).toBeGreaterThan(31000);
    expect(allVerses(translation).every((text) => text.length > 0)).toBe(true);
  });

  it('holds the expected text', () => {
    expect(readChapter('bsb', 'john', 1).verses[0]?.text).toBe('In the beginning was the Word, and the Word was with God, and the Word was God.');
    expect(readChapter('kjv', 'genesis', 1).verses[0]?.text).toBe('In the beginning God created the heaven and the earth.');
  });

  it.each(['bsb', 'kjv'])('%s\'s whole-Bible search file matches its chapters', (translation) => {
    const verses = JSON.parse(readFileSync(`apps/web/public/bible/${translation}/verses.json`, 'utf8')) as SearchableVerse[];

    expect(verses).toHaveLength(allVerses(translation).length);
    expect(verses[0]?.slice(0, 3)).toEqual(['genesis', 1, 1]);
    expect(verses.at(-1)?.slice(0, 3)).toEqual(['revelation', 22, 21]);
  });

  it('has no leftover bracket markup in the KJV', () => {
    expect(allVerses('kjv').filter((text) => /[[\]]/.test(text))).toEqual([]);
  });

  it('keeps gaps where the BSB omits a verse', () => {
    const numbers = readChapter('bsb', 'matthew', 17).verses.map(({verse}) => verse);

    expect(numbers).toContain(20);
    expect(numbers).not.toContain(21);
    expect(numbers).toContain(22);
  });
});

import {describe, expect, it} from 'vitest';
import {BIBLE_SECTIONS} from '../src/bibleSections';

describe('BIBLE_SECTIONS', () => {
  it('holds all 66 books exactly once', () => {
    const books = BIBLE_SECTIONS.flatMap((section) => section.books);

    expect(books).toHaveLength(66);
    expect(new Set(books).size).toBe(66);
    expect(books[0]).toBe('Genesis');
    expect(books.at(-1)).toBe('Revelation');
  });
});

import {BIBLE_SECTIONS} from './bibleSections.ts';

export interface BibleBook {
  name: string;
  /** Its part of a reader URL, e.g. `song-of-solomon`. */
  slug: string;
  /** The name of its section of the thumb index. */
  section: string;
  chapters: number;
}

export interface ChapterRef {
  book: BibleBook;
  chapter: number;
}

export interface Verse {
  verse: number;
  text: string;
}

/** One chapter of one translation. Verse numbers can have gaps, as some translations omit a verse. */
export interface ChapterText {
  verses: Verse[];
}

/** In the canonical order of `BIBLE_SECTIONS`. */
const CHAPTER_COUNTS = [
  50, 40, 27, 36, 34,
  24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10,
  42, 150, 31, 12, 8,
  66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4,
  28, 16, 24, 21, 28,
  16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1,
  22,
];

function toSlug(name: string): string {
  return name.toLowerCase().replaceAll(' ', '-');
}

export const BIBLE_BOOKS: readonly BibleBook[] = BIBLE_SECTIONS
  .flatMap(({name: section, books}) => books.map((name) => ({name, section, slug: toSlug(name)})))
  .map((book, index) => ({...book, chapters: CHAPTER_COUNTS[index] ?? 0}));

/** The chapter a reader URL names, or null if there is no such chapter. */
export function parseChapterRef(slug: string | undefined, chapter: string | undefined): ChapterRef | null {
  const book = BIBLE_BOOKS.find((candidate) => candidate.slug === slug);

  if (!book || !chapter || !/^[1-9]\d*$/.test(chapter) || Number(chapter) > book.chapters) {
    return null;
  }

  return {book, chapter: Number(chapter)};
}

/** The next chapter, moving into the next book at the end of one, or null after Revelation 22. */
export function nextChapter({book, chapter}: ChapterRef): ChapterRef | null {
  if (chapter < book.chapters) {
    return {book, chapter: chapter + 1};
  }

  const nextBook = BIBLE_BOOKS[BIBLE_BOOKS.indexOf(book) + 1];

  return nextBook ? {book: nextBook, chapter: 1} : null;
}

/** The previous chapter, moving into the last chapter of the previous book, or null before Genesis 1. */
export function previousChapter({book, chapter}: ChapterRef): ChapterRef | null {
  if (chapter > 1) {
    return {book, chapter: chapter - 1};
  }

  const previousBook = BIBLE_BOOKS[BIBLE_BOOKS.indexOf(book) - 1];

  return previousBook ? {book: previousBook, chapter: previousBook.chapters} : null;
}

/** How to name a chapter in a heading. A single psalm is a "Psalm", not a "Psalms". */
export function chapterTitle({book, chapter}: ChapterRef): string {
  return `${book.name === 'Psalms' ? 'Psalm' : book.name} ${chapter}`;
}

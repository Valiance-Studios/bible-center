import type {ChapterRef, VerseReference} from '@bible-center/core';

/** Where the reader shows this chapter. */
export function chapterPath({book, chapter}: ChapterRef): string {
  return `/read/${book.slug}/${chapter}`;
}

/** Where the reader shows a reference's first verse. */
export function referencePath(reference: VerseReference): string {
  return `${chapterPath({book: reference.book, chapter: reference.startChapter})}#v${reference.startVerse ?? 1}`;
}

/** Where the reader opens when no chapter is named, and where an unknown chapter leads. */
export const READER_START_PATH = '/read/genesis/1';

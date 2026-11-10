import type {ChapterRef, VerseReference} from '@bible-center/core';

import {formatReference} from '@bible-center/core';

/** Where the reader shows this chapter. */
export function chapterPath({book, chapter}: ChapterRef): string {
  return `/read/${book.slug}/${chapter}`;
}

/** Where the reader shows a reference's first verse. */
export function referencePath(reference: VerseReference): string {
  return `${chapterPath({book: reference.book, chapter: reference.startChapter})}#v${reference.startVerse ?? 1}`;
}

export const MEMORIZE_PRACTICE_PATH = '/memorize/practice';

/** Where to practice a reference by heart, in a mode other than the first if given. */
export function memorizePath(reference: VerseReference, mode?: string): string {
  const search = new URLSearchParams({passage: formatReference(reference), ...(mode ? {mode} : {})});

  return `${MEMORIZE_PRACTICE_PATH}?${search.toString()}`;
}

/** Where the reader opens when no chapter is named, and where an unknown chapter leads. */
export const READER_START_PATH = '/read/genesis/1';

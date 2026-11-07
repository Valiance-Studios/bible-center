import type {ChapterRef} from './bibleBooks.ts';
import type {VerseId} from './verseId.ts';

import {BIBLE_BOOKS} from './bibleBooks.ts';
import {formatVerseId, parseVerseId} from './verseId.ts';

/** Keep in sync with `isValidAnnotation` in `firestore.rules`. */
export const NOTE_MAX_LENGTH = 2000;

export type AnnotationType = 'highlight' | 'bookmark' | 'note';

/** A verse or range of verses within one chapter, by verse number. */
export interface VerseSpan {
  start: number;
  end: number;
}

/**
 * Something a user marked on a verse or range. It stores verse ids rather than text,
 * so it appears in every translation and copies no scripture.
 */
export interface Annotation {
  id: string;
  type: AnnotationType;
  /** The `bbccc` start of its verse ids, for finding a chapter's annotations. */
  chapterId: string;
  startVerse: VerseId;
  endVerse: VerseId;
  /** Only on notes. */
  text?: string;
}

export function verseIdIn({book, chapter}: ChapterRef, verse: number): VerseId {
  return formatVerseId({book: BIBLE_BOOKS.indexOf(book) + 1, chapter, verse});
}

export function chapterIdOf(reference: ChapterRef): string {
  return verseIdIn(reference, 1).slice(0, 5);
}

export function spanOf({startVerse, endVerse}: Pick<Annotation, 'startVerse' | 'endVerse'>): VerseSpan {
  return {start: parseVerseId(startVerse)?.verse ?? 0, end: parseVerseId(endVerse)?.verse ?? 0};
}

export function spanContains({start, end}: VerseSpan, verse: number): boolean {
  return verse >= start && verse <= end;
}

export function spansOverlap(a: VerseSpan, b: VerseSpan): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/**
 * The selection after tapping a verse. The first tap selects it, tapping it again clears it,
 * tapping another verse makes a range between them, and tapping after a range starts over.
 */
export function selectVerse(current: VerseSpan | null, verse: number): VerseSpan | null {
  if (!current || current.start !== current.end) {
    return {start: verse, end: verse};
  }

  if (current.start === verse) {
    return null;
  }

  return {start: Math.min(current.start, verse), end: Math.max(current.start, verse)};
}

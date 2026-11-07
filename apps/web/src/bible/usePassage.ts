import type {Verse, VerseReference} from '@bible-center/core';
import type {TranslationProvider} from './translations';

import {useQueries} from '@tanstack/react-query';
import {chapterQuery} from './queries';

export interface PassageSection {
  chapter: number;
  verses: Verse[];
}

/** The verses of a reference in a translation, by chapter, loading each chapter it spans. */
export function usePassage(reference: VerseReference, translation: TranslationProvider) {
  const {book, startChapter, startVerse, endChapter, endVerse} = reference;
  const chapters = Array.from({length: endChapter - startChapter + 1}, (_, index) => startChapter + index);
  const results = useQueries({queries: chapters.map((chapter) => chapterQuery(translation, {book, chapter}))});
  const sections: PassageSection[] = chapters.map((chapter, index) => ({
    chapter,
    verses: (results[index]?.data?.verses ?? []).filter(({verse}) => {
      const isAfterStart = chapter !== startChapter || startVerse === null || verse >= startVerse;
      const isBeforeEnd = chapter !== endChapter || endVerse === null || verse <= endVerse;

      return isAfterStart && isBeforeEnd;
    }),
  }));
  const failed = results.filter((result) => result.isError);

  return {
    sections,
    /** The passage's text as one paragraph, without verse numbers. */
    text: sections.flatMap(({verses}) => verses.map(({text}) => text)).join(' '),
    isPending: results.some((result) => result.isPending),
    isError: failed.length > 0,
    retry: () => failed.forEach((result) => void result.refetch()),
  };
}

import type {ChapterRef, GrammarFile, LexiconFile, WordFile, WordFileLanguage} from '@bible-center/core';

import {fetchStaticJson} from '@/staticData';

/** Written by `scripts/build-word-data.ts`. */
const WORD_DATA = '/word-data';

async function required<T>(path: string): Promise<T> {
  const data = await fetchStaticJson<T>(path);

  if (!data) {
    throw new Error(`${path} is missing.`);
  }

  return data;
}

/** A chapter's Hebrew or Greek words. Every chapter has a file. */
export function wordChapterQuery({book, chapter}: ChapterRef) {
  return {
    queryKey: ['words', book.slug, chapter],
    queryFn: () => required<WordFile>(`${WORD_DATA}/${book.slug}/${chapter}.json`),
  };
}

/** The lexicon entries in one group of Strong's numbers, from `lexiconGroup`. */
export function lexiconQuery(group: string) {
  return {
    queryKey: ['lexicon', group],
    queryFn: () => required<LexiconFile>(`${WORD_DATA}/_lexicon/${group}.json`),
  };
}

/** Plain-English descriptions of a language's morphology codes. */
export function grammarQuery(language: WordFileLanguage) {
  return {
    queryKey: ['grammar', language],
    queryFn: () => required<GrammarFile>(`${WORD_DATA}/_grammar/${language}.json`),
  };
}

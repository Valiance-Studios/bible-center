import type {ChapterRef} from '@bible-center/core';
import type {TranslationProvider} from './translations';

import {buildPhraseIndex} from './phraseSearch';

/** A chapter's text, shared by the reader and search so each is only fetched once. */
export function chapterQuery(translation: TranslationProvider, reference: ChapterRef) {
  return {
    queryKey: ['chapter', translation.id, reference.book.slug, reference.chapter],
    queryFn: () => translation.getChapter(reference),
  };
}

/** A translation's search index, built once on the first phrase search. */
export function phraseIndexQuery(translation: TranslationProvider) {
  return {
    queryKey: ['phraseIndex', translation.id],
    queryFn: async () => buildPhraseIndex(await translation.getSearchableVerses()),
  };
}

import type {ChapterRef, LexiconEntry, VerseWord, WordLanguage, WordTranslation} from '@bible-center/core';

import {useQueries, useQuery} from '@tanstack/react-query';
import {languageOfWords, lexiconGroup, wordsOfVerse} from '@bible-center/core';
import {grammarQuery, lexiconQuery, wordChapterQuery} from '@/bible/wordData';

/** A word of a verse, with its dictionary entry and grammar once they load. */
export interface StudyWord extends VerseWord {
  /** The grammar in plain English, or its code until the descriptions load. */
  grammarText: string;
  entry: LexiconEntry | null;
}

/** The translations whose Greek the word data follows. Others, such as the ESV, use the BSB's. */
function wordTranslationOf(translationId: string): WordTranslation {
  return translationId === 'kjv' ? 'kjv' : 'bsb';
}

/**
 * A verse's Hebrew, Aramaic or Greek words as the translation follows them, with the dictionary entries and
 * grammar descriptions they use. Each comes from a static file, loaded once. With no verse, there are no
 * words, but the chapter's language is still known.
 */
export function useVerseWords(reference: ChapterRef, verse: number | null, translationId: string) {
  const chapter = useQuery(wordChapterQuery(reference));
  const words = chapter.data && verse !== null ? wordsOfVerse(chapter.data, wordTranslationOf(translationId), verse) : [];
  const grammar = useQuery({...grammarQuery(chapter.data?.language ?? 'hebrew'), enabled: chapter.data !== undefined});
  const groups = [...new Set(words.flatMap(({strongs}) => lexiconGroup(strongs) ?? []))];
  const lexicons = useQueries({queries: groups.map((group) => lexiconQuery(group))});
  const entries = Object.assign({}, ...lexicons.map(({data}) => data ?? {})) as Record<string, LexiconEntry>;
  const language: WordLanguage | null = chapter.data ? languageOfWords(chapter.data.language, words) : null;

  return {
    language,
    words: words.map((word): StudyWord => ({
      ...word,
      grammarText: grammar.data?.[word.grammar] ?? word.grammar,
      entry: entries[word.strongs] ?? null,
    })),
    isPending: chapter.isPending,
    /** Only the words themselves are needed; a dictionary or grammar file that fails leaves its parts blank. */
    isError: chapter.isError,
    isLoadingDetails: grammar.isPending || lexicons.some(({isPending}) => isPending),
    retry: () => void chapter.refetch(),
  };
}

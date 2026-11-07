import type {SearchableVerse} from '@bible-center/core';

import MiniSearch from 'minisearch';

export interface PhraseMatch {
  slug: string;
  chapter: number;
  verse: number;
  text: string;
  /** The words in the text that matched, for highlighting. */
  matchedWords: string[];
  /** Whether the text holds the search's exact wording. */
  isExact: boolean;
}

interface IndexedVerse {
  id: number;
  slug: string;
  chapter: number;
  verse: number;
  text: string;
}

const MAX_RESULTS = 20;
const FUZZINESS = 0.2;
/** Shorter words only match exactly, or `i` would also find `is`, `it` and `idols`, and `zzz` would find `Ziz`. */
const MIN_LOOSE_MATCH_LENGTH = 4;
/** A verse must hold at least this share of the search's words, so one common word is not a match. */
const MIN_WORDS_MATCHED = 0.5;

/** Words only, so `"mercies never fail,"` matches `mercies never fail.` */
function normalize(text: string): string {
  return text.toLowerCase().replaceAll(/[^\p{L}\p{N}\s]/gu, ' ').replaceAll(/\s+/g, ' ').trim();
}

export interface PhraseIndex {
  search: (query: string) => PhraseMatch[];
}

/**
 * Indexes a translation for searching by remembered wording. Matching tolerates typos and missing
 * words, so a remembered paraphrase can still find its verse, and any verse holding the exact
 * wording comes first.
 */
export function buildPhraseIndex(verses: readonly SearchableVerse[]): PhraseIndex {
  const index = new MiniSearch<IndexedVerse>({fields: ['text'], storeFields: ['slug', 'chapter', 'verse', 'text']});

  index.addAll(verses.map(([slug, chapter, verse, text], id) => ({id, slug, chapter, verse, text})));

  return {
    search: (query) => {
      const phrase = normalize(query);

      if (!phrase) {
        return [];
      }

      const wordCount = new Set(phrase.split(' ')).size;
      const results = index.search(phrase, {
        fuzzy: (term) => term.length >= MIN_LOOSE_MATCH_LENGTH ? FUZZINESS : false,
        prefix: (term) => term.length >= MIN_LOOSE_MATCH_LENGTH,
        combineWith: 'OR',
      });

      return results
        .filter((result) => result.queryTerms.length >= wordCount * MIN_WORDS_MATCHED)
        .map((result) => ({
          score: result.score,
          match: {
            slug: result['slug'] as string,
            chapter: result['chapter'] as number,
            verse: result['verse'] as number,
            text: result['text'] as string,
            matchedWords: result.terms,
            isExact: normalize(result['text'] as string).includes(phrase),
          },
        }))
        .sort((a, b) => Number(b.match.isExact) - Number(a.match.isExact) || b.score - a.score)
        .slice(0, MAX_RESULTS)
        .map(({match}) => match);
    },
  };
}

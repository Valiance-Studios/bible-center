import type {ChapterRef, ChapterText} from '@bible-center/core';

/** A translation the reader can show. A new source of text means a new implementation, not changes to the reader. */
export interface TranslationProvider {
  id: string;
  name: string;
  /** The notice shown beneath the text. */
  credit: string;
  getChapter: (reference: ChapterRef) => Promise<ChapterText>;
}

/** Reads the per-chapter files `scripts/build-bible-data.ts` writes. */
function staticTranslation(id: string, name: string, credit: string): TranslationProvider {
  return {
    id,
    name,
    credit,
    getChapter: async ({book, chapter}) => {
      const response = await fetch(`/bible/${id}/${book.slug}/${chapter}.json`);

      if (!response.ok) {
        throw new Error(`Could not load ${name}, ${book.name} ${chapter}: ${response.status}`);
      }

      return await response.json() as ChapterText;
    },
  };
}

export const TRANSLATIONS: readonly [TranslationProvider, ...TranslationProvider[]] = [
  staticTranslation('bsb', 'Berean Standard Bible', 'Berean Standard Bible, dedicated to the public domain.'),
  staticTranslation('kjv', 'King James Version', 'King James Version, public domain in the United States.'),
];

export const DEFAULT_TRANSLATION = TRANSLATIONS[0];

/** The translation with this id, or the default if there is none, as for an id saved before one was removed. */
export function findTranslation(id: string): TranslationProvider {
  return TRANSLATIONS.find((translation) => translation.id === id) ?? DEFAULT_TRANSLATION;
}

import type {VerseId, VerseReference} from '@bible-center/core';
import type {TranslationProvider} from './translations';

import {formatReference, parseReferences, verseIdIn} from '@bible-center/core';
import {usePassage} from './usePassage';

/** A verse or passage by its first and last verse ids. */
export interface ReferenceSpan {
  startVerse: VerseId;
  endVerse: VerseId;
}

/** One reference, or null if the text is not exactly one. */
function parseOneReference(text: string): VerseReference | null {
  const references = text.trim() ? parseReferences(text) : null;

  return references?.length === 1 ? references[0] ?? null : null;
}

/**
 * Checks a typed reference, such as "Psalm 23:1-4", against a translation, for forms that take one verse or passage.
 * Every verse it names must exist, so "John 1:1-99" is not stored as a passage that runs past the chapter.
 */
export function useReferenceSpan(text: string, translation: TranslationProvider) {
  const reference = parseOneReference(text);
  const passage = usePassage(reference, translation);
  const isLoaded = reference !== null && !passage.isPending && !passage.isError;
  const firstSection = passage.sections[0];
  const lastSection = passage.sections.at(-1);
  const firstVerse = firstSection?.verses[0]?.verse;
  const lastVerse = lastSection?.verses.at(-1)?.verse;
  const isWhole = isLoaded
    && firstVerse !== undefined && lastVerse !== undefined
    && (reference.startVerse === null || reference.startVerse === firstVerse)
    && (reference.endVerse === null || reference.endVerse === lastVerse);
  const span: ReferenceSpan | null = reference && isWhole && firstSection && lastSection
    ? {
        startVerse: verseIdIn({book: reference.book, chapter: firstSection.chapter}, firstVerse),
        endVerse: verseIdIn({book: reference.book, chapter: lastSection.chapter}, lastVerse),
      }
    : null;
  const title = reference ? formatReference(reference) : '';
  let problem: string | null = null;

  if (text.trim() && !reference) {
    problem = 'Enter one reference, such as Romans 12:15 or Psalm 23:1-4.';
  } else if (isLoaded && !isWhole) {
    problem = `There is no ${title} in the ${translation.name}.`;
  }

  return {
    /** The passage, once every verse it names is known to exist. */
    span,
    /** How to display the reference, such as "Psalm 23:1–4". */
    title,
    passage,
    /** Why the text cannot be used, if it cannot. */
    problem,
  };
}

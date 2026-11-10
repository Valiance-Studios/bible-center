import type {VerseId} from '@bible-center/core';
import type {TranslationProvider} from './translations';

import {formatReference, referenceOf} from '@bible-center/core';
import {usePassage} from './usePassage';

/** A passage's text in a translation, and how to label it, such as "Lamentations 3:22–23, BSB". */
export function useSpanText(span: {startVerse: VerseId; endVerse: VerseId} | null | undefined, translation: TranslationProvider) {
  const reference = span ? referenceOf(span) : null;
  const passage = usePassage(reference, translation);

  return {
    reference,
    label: reference ? `${formatReference(reference)}, ${translation.abbreviation}` : '',
    passage,
  };
}

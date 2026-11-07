import {NativeSelect} from '@mantine/core';
import {findTranslation, TRANSLATIONS} from '@/bible/translations';
import {useTranslationStore} from '@/stores/translation';

interface TranslationSelectProps {
  /** Lists translations by initialism, such as "KJV", where the full names do not fit. */
  isCompact?: boolean;
}

/** Picks the translation being read and searched. */
export function TranslationSelect({isCompact = false}: TranslationSelectProps) {
  const translationId = useTranslationStore((state) => state.translationId);
  const setTranslationId = useTranslationStore((state) => state.setTranslationId);

  return (
    <NativeSelect
      size="md"
      aria-label="Translation"
      value={findTranslation(translationId).id}
      data={TRANSLATIONS.map(({id, name, abbreviation}) => ({label: isCompact ? abbreviation : name, value: id}))}
      onChange={(event) => setTranslationId(event.currentTarget.value)}
    />
  );
}

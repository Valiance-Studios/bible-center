import {NativeSelect} from '@mantine/core';
import {findTranslation, TRANSLATIONS} from '@/bible/translations';
import {useTranslationStore} from '@/stores/translation';

/** Picks the translation being read and searched. */
export function TranslationSelect() {
  const translationId = useTranslationStore((state) => state.translationId);
  const setTranslationId = useTranslationStore((state) => state.setTranslationId);

  return (
    <NativeSelect
      size="md"
      aria-label="Translation"
      value={findTranslation(translationId).id}
      data={TRANSLATIONS.map(({id, name}) => ({label: name, value: id}))}
      onChange={(event) => setTranslationId(event.currentTarget.value)}
    />
  );
}

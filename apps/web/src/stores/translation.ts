import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {DEFAULT_TRANSLATION} from '@/bible/translations';

interface TranslationState {
  translationId: string;
  setTranslationId: (translationId: string) => void;
}

/** The translation being read, remembered in this browser. */
export const useTranslationStore = create<TranslationState>()(persist(
  (set) => ({
    translationId: DEFAULT_TRANSLATION.id,
    setTranslationId: (translationId) => set({translationId}),
  }),
  {name: 'bible-center-translation'},
));

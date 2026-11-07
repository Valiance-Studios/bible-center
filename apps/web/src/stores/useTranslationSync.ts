import {useEffect} from 'react';
import {TRANSLATIONS} from '@/bible/translations';
import {loadUserSettings, saveTranslationChoice} from '@/firebase/settings';
import {useAuthStore} from './auth';
import {useTranslationStore} from './translation';

/**
 * Makes a signed-in user's translation follow them between devices: applies their saved choice,
 * and saves each change they make. A failure only costs that convenience, as the choice is also kept in this browser.
 */
export function useTranslationSync(): void {
  const uid = useAuthStore((state) => state.status === 'allowed' ? state.user?.uid : undefined);

  useEffect(() => {
    if (!uid) {
      return undefined;
    }

    let isActive = true;
    // Set while applying the saved choice, which should not be saved straight back.
    let isApplyingSaved = false;
    // A choice made while the saved one loads is newer, so the saved one must not replace it.
    let hasChosen = false;

    const stopSaving = useTranslationStore.subscribe((state, previous) => {
      if (isApplyingSaved || state.translationId === previous.translationId) {
        return;
      }

      hasChosen = true;
      saveTranslationChoice(uid, state.translationId).catch((error: unknown) => {
        console.error('Could not save the translation choice', error);
      });
    });

    loadUserSettings(uid)
      .then((settings) => {
        const saved = settings?.translationId;

        if (isActive && !hasChosen && saved && TRANSLATIONS.some(({id}) => id === saved)) {
          isApplyingSaved = true;
          useTranslationStore.getState().setTranslationId(saved);
          isApplyingSaved = false;
        }
      })
      .catch((error: unknown) => {
        console.error('Could not load user settings', error);
      });

    return () => {
      isActive = false;
      stopSaving();
    };
  }, [uid]);
}

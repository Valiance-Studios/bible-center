import type {DailyVerse, DailyVerseList} from '@bible-center/core';

import {automaticDailyVerse} from '@bible-center/core';
import {useQuery} from '@tanstack/react-query';
import {getChosenDailyVerse} from '@/firebase/dailyVerses';
import {fetchStaticJson} from '@/staticData';

/** The automatic list `scripts/build-daily-verses.ts` writes, loaded once. */
export const automaticListQuery = {
  queryKey: ['dailyVerses', 'automatic'],
  queryFn: async () => {
    const list = await fetchStaticJson<DailyVerseList>('/daily-verses.json');

    if (!list) {
      throw new Error('The automatic list of verses is missing.');
    }

    return list;
  },
};

/** The verse an admin chose for a date, if any. Saving one invalidates this key. */
export function chosenDailyVerseQuery(date: string) {
  return {
    queryKey: ['dailyVerses', 'chosen', date],
    queryFn: () => getChosenDailyVerse(date),
  };
}

/** The automatic list's pick for a date, for the dialog's preview and when no verse was chosen. */
export function useAutomaticDailyVerse(date: string) {
  const list = useQuery(automaticListQuery);

  return {...list, data: list.data ? automaticDailyVerse(list.data, date) : undefined};
}

export interface VerseOfTheDay {
  /** The verse to show, once known. */
  verse: DailyVerse | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * The verse of the day for a date: the one an admin chose, or else the automatic list's pick. If the chosen one
 * cannot be loaded, the automatic pick still shows, so the home page always has a verse.
 */
export function useVerseOfTheDay(date: string): VerseOfTheDay {
  const chosen = useQuery(chosenDailyVerseQuery(date));
  const automatic = useAutomaticDailyVerse(date);
  const isChosenSettled = chosen.isSuccess || chosen.isError;
  const verse = chosen.data ?? (isChosenSettled ? automatic.data ?? null : null);

  return {
    verse,
    isPending: !verse && (chosen.isPending || automatic.isPending),
    isError: !verse && automatic.isError && isChosenSettled,
    retry: () => {
      void chosen.refetch();
      void automatic.refetch();
    },
  };
}

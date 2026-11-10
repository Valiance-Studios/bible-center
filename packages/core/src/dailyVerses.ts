import type {VerseId} from './verseId.ts';

/** A verse or passage for the verse of the day, by its first and last verse ids. */
export interface DailyVerse {
  startVerse: VerseId;
  endVerse: VerseId;
}

/** The automatic list, one passage for each day of a leap year, as `scripts/build-daily-verses.ts` writes it. */
export type DailyVerseList = readonly (readonly [startVerse: VerseId, endVerse: VerseId])[];

/** One for each day of a leap year, so every date, February 29 included, has its own. */
export const DAILY_VERSE_COUNT = 366;

/** A date as `dailyVerses` keys it: `YYYY-MM-DD`. Matches `isDateKey` in `firestore.rules`. */
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
/** A leap year, so February 29 has a place. */
const LEAP_YEAR = 2000;

/** The date as it is where the viewer is, so the verse changes at their midnight. */
export function dateKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateKey(key: string): {year: number; month: number; day: number} | null {
  const match = DATE_KEY_PATTERN.exec(key);

  if (!match) {
    return null;
  }

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date rolls an impossible day over into the next month, so a mismatch means it does not exist.
  const isReal = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

  return isReal ? {year, month, day} : null;
}

/** Whether the text is a real date written as `YYYY-MM-DD`. */
export function isDateKey(key: string): boolean {
  return parseDateKey(key) !== null;
}

/**
 * The date's place in a leap year, from 0 for January 1 to 365 for December 31. A date keeps its place every
 * year, so March 1 always gets the same verse, and only February 29 is skipped in other years.
 */
export function dayOfLeapYear(key: string): number {
  const date = parseDateKey(key);

  if (!date) {
    throw new RangeError(`Not a date: ${key}`);
  }

  return (Date.UTC(LEAP_YEAR, date.month - 1, date.day) - Date.UTC(LEAP_YEAR, 0, 1)) / MS_PER_DAY;
}

/** The automatic list's passage for the date, the same for everyone on that date. */
export function automaticDailyVerse(list: DailyVerseList, key: string): DailyVerse {
  const entry = list[dayOfLeapYear(key) % list.length];

  if (!entry) {
    throw new RangeError('The automatic list of verses is empty.');
  }

  return {startVerse: entry[0], endVerse: entry[1]};
}

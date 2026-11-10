import type {VerseId} from './verseId.ts';

/** Where a verse on someone's memory list stands. Keep in sync with `memoryVerses` in `firestore.rules`. */
export const MEMORY_STATUSES = ['learning', 'memorized'] as const;

export type MemoryStatus = typeof MEMORY_STATUSES[number];

/** A verse or passage on someone's memory list. */
export interface MemoryVerse {
  startVerse: VerseId;
  endVerse: VerseId;
  status: MemoryStatus;
  createdAt: Date;
  /** When they last practiced it, which adding it counts as. */
  practicedAt: Date;
}

/** A memorized verse comes back for review this long after it was last practiced. */
export const REVIEW_AFTER_DAYS = 7;

const MS_PER_DAY = 86_400_000;

/** The memory list's sections, in the order they are shown. */
export const MEMORY_GROUPS = ['due', 'learning', 'memorized'] as const;

export type MemoryGroup = typeof MEMORY_GROUPS[number];

export function isDueForReview({status, practicedAt}: Pick<MemoryVerse, 'status' | 'practicedAt'>, now: Date): boolean {
  return status === 'memorized' && now.getTime() - practicedAt.getTime() >= REVIEW_AFTER_DAYS * MS_PER_DAY;
}

function groupOf(verse: MemoryVerse, now: Date): MemoryGroup {
  return isDueForReview(verse, now) ? 'due' : verse.status;
}

/** Oldest practice first, so the one waiting longest comes first. */
const byOldestPractice = (a: MemoryVerse, b: MemoryVerse) => a.practicedAt.getTime() - b.practicedAt.getTime();
/** Newest first. */
const byNewest = (a: MemoryVerse, b: MemoryVerse) => b.createdAt.getTime() - a.createdAt.getTime();
const byRecentPractice = (a: MemoryVerse, b: MemoryVerse) => b.practicedAt.getTime() - a.practicedAt.getTime();

const GROUP_ORDER: Record<MemoryGroup, (a: MemoryVerse, b: MemoryVerse) => number> = {
  due: byOldestPractice,
  learning: byNewest,
  memorized: byRecentPractice,
};

/** The memory list in its sections, leaving out empty ones: due for review, learning, then memorized. */
export function groupMemoryVerses<T extends MemoryVerse>(verses: readonly T[], now: Date): {group: MemoryGroup; verses: T[]}[] {
  return MEMORY_GROUPS
    .map((group) => ({group, verses: verses.filter((verse) => groupOf(verse, now) === group).sort(GROUP_ORDER[group])}))
    .filter(({verses: inGroup}) => inGroup.length > 0);
}

/** Fading words: everything shown, then one word in three hidden, two in three, first letters only, and none. */
export const FADING_STEP_COUNT = 5;

/** A word of a passage, split so its punctuation can stay in view while the word itself is hidden. */
export interface FadingWord {
  /** Opening punctuation, such as a quotation mark. */
  before: string;
  word: string;
  /** Closing punctuation, such as a comma or full stop. */
  after: string;
  /** Hidden at this step. */
  isHidden: boolean;
  /** What a hidden word shows: its first letter at the first-letters step, otherwise nothing. */
  hint: string;
}

const WORD = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u;
const FIRST_LETTERS_STEP = 3;

function isHiddenAt(step: number, index: number): boolean {
  if (step <= 0) {
    return false;
  }

  if (step === 1) {
    return index % 3 === 1;
  }

  if (step === 2) {
    return index % 3 !== 0;
  }

  return true;
}

/** A passage's words at a fading step, from 0 (all shown) to `FADING_STEP_COUNT - 1` (all hidden). */
export function fadeWords(text: string, step: number): FadingWord[] {
  return text.split(/\s+/).filter(Boolean).map((token, index) => {
    const [, before = '', word = '', after = ''] = WORD.exec(token) ?? [];
    // A token that is only punctuation, such as a dash, is never hidden.
    const isHidden = word.length > 0 && isHiddenAt(step, index);

    return {before, word, after, isHidden, hint: isHidden && step === FIRST_LETTERS_STEP ? word.slice(0, 1) : ''};
  });
}

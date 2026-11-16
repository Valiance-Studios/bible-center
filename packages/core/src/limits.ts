/**
 * How much one account can keep, and how often it can do things others must review, so a single account
 * cannot flood reviewers or run up costs. Keep in sync with `addsToCount` and `stampsAfterCooldown` in `firestore.rules`.
 */
export const WRITE_LIMITS = {
  /** Highlights, bookmarks and notes, together. */
  annotations: 5000,
  /** Verses and passages on the memory list. */
  memoryVerses: 500,
} as const;

export type CountedKind = keyof typeof WRITE_LIMITS;

export const COOLDOWN_MS = {
  /** Between one report and the next. */
  report: 60 * 1000,
  /** Between starting one topic and the next. */
  topic: 10 * 60 * 1000,
} as const;

export type CooldownKind = keyof typeof COOLDOWN_MS;

/** When someone who last did this at `last` can do it again, or null if they can now. */
export function cooldownEndsAt(kind: CooldownKind, last: Date | null, now: Date): Date | null {
  if (!last) {
    return null;
  }

  const endsAt = new Date(last.getTime() + COOLDOWN_MS[kind]);

  return endsAt > now ? endsAt : null;
}

/** The starting score of a topic's most-voted OpenBible verse, which about this many Bible Center upvotes can overtake. */
export const MAX_SEED_SCORE = 20;

/**
 * Scales an OpenBible vote count down to a starting score from 0 to `MAX_SEED_SCORE`, relative to the
 * topic's most-voted verse. The log scale keeps OpenBible's order while stopping its large counts
 * (thousands of votes on popular topics) from permanently outranking Bible Center's own votes.
 */
export function seedScore(openBibleVotes: number, topicMaxOpenBibleVotes: number): number {
  if (openBibleVotes <= 0 || topicMaxOpenBibleVotes <= 0) {
    return 0;
  }

  return MAX_SEED_SCORE * Math.log1p(openBibleVotes) / Math.log1p(topicMaxOpenBibleVotes);
}

/** Where a verse ranks within a topic: its OpenBible starting score plus one point per Bible Center upvote. */
export function topicVerseScore(openBibleVotes: number, topicMaxOpenBibleVotes: number, upvotes: number): number {
  return seedScore(openBibleVotes, topicMaxOpenBibleVotes) + upvotes;
}

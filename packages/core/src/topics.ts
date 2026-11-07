import type {VerseId} from './verseId.ts';

import {topicVerseScore} from './topicScore.ts';

/** A verse or passage in a topic's static file: its first verse, last verse, and OpenBible votes. */
export type TopicFileVerse = [startVerse: VerseId, endVerse: VerseId, openBibleVotes: number];

/** One topic's static file, written by `scripts/build-topic-data.ts`. Verses come most-voted first. */
export interface TopicFile {
  name: string;
  verses: TopicFileVerse[];
}

/** A verse or passage on a topic, with the votes that rank it. */
export interface TopicVerse {
  startVerse: VerseId;
  endVerse: VerseId;
  openBibleVotes: number;
  upvotes: number;
  score: number;
}

/** Lowercase with single spaces, so `Self  Control ` and `self control` are the same topic. */
export function normalizeTopicName(name: string): string {
  return name.trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

/** A topic's part of a URL and its file name, such as `self-control` for "self control". */
export function topicSlug(name: string): string {
  return normalizeTopicName(name).replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '');
}

/** Identifies a verse or passage within a topic, for its votes: `bbcccvvv`, or `bbcccvvv-bbcccvvv` for a passage. */
export function topicVerseKey(startVerse: VerseId, endVerse: VerseId): string {
  return startVerse === endVerse ? startVerse : `${startVerse}-${endVerse}`;
}

/**
 * Ranks a topic's verses by `topicVerseScore`: OpenBible's votes as a starting score, plus Bible Center upvotes,
 * keyed by `topicVerseKey`. Ties go to more OpenBible votes, then Bible order.
 */
export function rankTopicVerses(verses: readonly TopicFileVerse[], upvotes: ReadonlyMap<string, number>): TopicVerse[] {
  const topicMax = Math.max(0, ...verses.map(([, , votes]) => votes));

  return verses
    .map(([startVerse, endVerse, openBibleVotes]) => {
      const verseUpvotes = upvotes.get(topicVerseKey(startVerse, endVerse)) ?? 0;

      return {startVerse, endVerse, openBibleVotes, upvotes: verseUpvotes, score: topicVerseScore(openBibleVotes, topicMax, verseUpvotes)};
    })
    .sort((a, b) => b.score - a.score || b.openBibleVotes - a.openBibleVotes || a.startVerse.localeCompare(b.startVerse));
}

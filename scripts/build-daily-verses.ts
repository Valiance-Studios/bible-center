/**
 * Builds the automatic list for the verse of the day, `apps/web/public/daily-verses.json`: one short passage for
 * each day of a leap year, from the passages OpenBible.info's voters (CC BY) rank highest on encouraging topics.
 *
 * Usage: npm run daily-verses (after npm run topic-data, and commit the result)
 *
 * It reads the committed topic data and BSB text, so it needs no network. The list holds verse ids only, with no
 * scripture text. Someone should read it through before launch. See "Verse of the Day" in ARCHITECTURE.md.
 */
import type {DailyVerseList} from '../packages/core/src/dailyVerses.ts';
import type {ChapterText} from '../packages/core/src/bibleBooks.ts';
import type {TopicFile} from '../packages/core/src/topics.ts';
import type {VerseId} from '../packages/core/src/verseId.ts';

import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BIBLE_BOOKS} from '../packages/core/src/bibleBooks.ts';
import {DAILY_VERSE_COUNT} from '../packages/core/src/dailyVerses.ts';
import {topicVerseKey} from '../packages/core/src/topics.ts';
import {parseVerseId} from '../packages/core/src/verseId.ts';

/** The home page shows the verse in large type, so a passage runs to a few verses and a few lines at most. */
const MAX_VERSES = 3;
const MAX_CHARACTERS = 160;

/**
 * The topics whose votes count, by slug. OpenBible's votes measure how well a verse fits a topic, not how
 * encouraging it is, so counting every topic would bring in verses on divorce or idolatry. These are the ones
 * people look to for a verse to start the day with.
 */
const DEVOTIONAL_TOPICS: ReadonlySet<string> = new Set([
  'anxiety', 'blessings', 'comfort', 'contentment', 'courage', 'depression', 'difficult-times', 'encouragement',
  'eternal-life', 'faith', 'forgiveness', 'gentleness', 'gods-faithfulness', 'gods-grace', 'gods-love', 'gods-plan',
  'gods-promises', 'goodness', 'grace', 'gratitude', 'guidance', 'hard-times', 'healing', 'holy-spirit', 'hope',
  'jesus-love', 'joy', 'kindness', 'loneliness', 'love', 'mercy', 'new-life', 'patience', 'peace', 'perseverance',
  'praise', 'prayer', 'protection', 'provision', 'rest', 'salvation', 'strength', 'thankfulness', 'trust', 'wisdom',
  'worry', 'worship',
]);

/**
 * Passages left out after reading the list, by `topicVerseKey`, because they do not stand alone as a verse for the
 * day despite their votes. Add to it when reviewing the list, then rebuild.
 */
const EXCLUDED_PASSAGES: ReadonlySet<string> = new Set([
  '03020013', // Leviticus 20:13, a penalty under the law
  '40008024', // Matthew 8:24, the middle of a story
  '54001007', // 1 Timothy 1:7, about false teachers
  '60004003', // 1 Peter 4:3, a list of vices
]);

/** The book of Psalms, whose titles the source files run into verse 1. */
const PSALMS = 19;

/** Fixed, so rebuilding from the same data gives the same order. */
const SHUFFLE_SEED = 20261110;

/** The BSB text of a passage, or null if it is not all there. */
export type PassageText = (startVerse: VerseId, endVerse: VerseId) => string | null;

interface Candidate {
  startVerse: VerseId;
  endVerse: VerseId;
  votes: number;
}

/** Starts a sentence: a capital letter, perhaps after an opening quotation mark. */
const STARTS_SENTENCE = /^[“‘"']?[A-Z]/;
/** Ends one: a full stop, question or exclamation mark, perhaps before closing quotation marks. */
const ENDS_SENTENCE = /[.?!][”’"')]*$/;

/** Whether every opening double quotation mark is closed, so a passage does not start or stop mid-quotation. */
function hasBalancedQuotes(text: string): boolean {
  let depth = 0;

  for (const character of text) {
    depth += character === '“' ? 1 : character === '”' ? -1 : 0;

    if (depth < 0) {
      return false;
    }
  }

  return depth === 0;
}

/**
 * Within one chapter, a few verses long, and reads as whole sentences on its own. A psalm's first verse is left out,
 * since it often begins with the psalm's title, such as "A Psalm of David."
 */
function isShortWholePassage({startVerse, endVerse}: Candidate, textOf: PassageText): boolean {
  const start = parseVerseId(startVerse);
  const end = parseVerseId(endVerse);

  if (!start || !end || start.book !== end.book || start.chapter !== end.chapter || end.verse - start.verse >= MAX_VERSES
    || (start.book === PSALMS && start.verse === 1)) {
    return false;
  }

  const text = textOf(startVerse, endVerse);

  return text !== null
    && text.length <= MAX_CHARACTERS
    && STARTS_SENTENCE.test(text)
    && ENDS_SENTENCE.test(text)
    && hasBalancedQuotes(text);
}

function overlaps(a: Candidate, b: Candidate): boolean {
  return a.startVerse <= b.endVerse && b.startVerse <= a.endVerse;
}

/** A small seeded generator (mulberry32), so the shuffle is the same on every run. */
function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6D2B79F5) | 0;

    let value = Math.imul(state ^ (state >>> 15), 1 | state);

    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));

    [shuffled[index], shuffled[other]] = [shuffled[other] as T, shuffled[index] as T];
  }

  return shuffled;
}

/**
 * The automatic list: the most-voted short passages across the topics given, with no two overlapping, so John 3:16 and
 * John 3:16-17 do not both appear. They are shuffled with a fixed seed, so the best-loved verses are spread across
 * the year rather than all in January.
 */
export function chooseDailyVerses(topics: Iterable<TopicFile>, textOf: PassageText, count = DAILY_VERSE_COUNT): DailyVerseList {
  const totals = new Map<string, Candidate>();

  for (const {verses} of topics) {
    for (const [startVerse, endVerse, votes] of verses) {
      const key = topicVerseKey(startVerse, endVerse);
      const total = totals.get(key) ?? {startVerse, endVerse, votes: 0};

      totals.set(key, {...total, votes: total.votes + votes});
    }
  }

  const ranked = [...totals.values()].sort((a, b) => b.votes - a.votes || a.startVerse.localeCompare(b.startVerse) || a.endVerse.localeCompare(b.endVerse));
  const chosen: Candidate[] = [];

  for (const candidate of ranked) {
    if (chosen.length === count) {
      break;
    }

    const isExcluded = EXCLUDED_PASSAGES.has(topicVerseKey(candidate.startVerse, candidate.endVerse));

    if (!isExcluded && isShortWholePassage(candidate, textOf) && !chosen.some((other) => overlaps(other, candidate))) {
      chosen.push(candidate);
    }
  }

  if (chosen.length < count) {
    throw new Error(`Only ${chosen.length} passages qualified, but the list needs ${count}.`);
  }

  return shuffle(chosen, seededRandom(SHUFFLE_SEED)).map(({startVerse, endVerse}) => [startVerse, endVerse] as const);
}

/** Reads BSB chapters from `apps/web/public/bible/bsb`, each once. */
function bsbPassageText(): PassageText {
  const chapters = new Map<string, ChapterText>();

  return (startVerse, endVerse) => {
    const start = parseVerseId(startVerse);
    const end = parseVerseId(endVerse);
    const book = start ? BIBLE_BOOKS[start.book - 1] : undefined;

    if (!start || !end || !book) {
      return null;
    }

    const path = `${book.slug}/${start.chapter}`;
    let chapter = chapters.get(path);

    if (!chapter) {
      chapter = JSON.parse(readFileSync(new URL(`../apps/web/public/bible/bsb/${path}.json`, import.meta.url), 'utf8')) as ChapterText;
      chapters.set(path, chapter);
    }

    const verses = chapter.verses.filter(({verse}) => verse >= start.verse && verse <= end.verse);

    return verses.length === end.verse - start.verse + 1 ? verses.map(({text}) => text).join(' ') : null;
  };
}

if (import.meta.main) {
  const topicDir = new URL('../apps/web/public/topic-data/', import.meta.url);
  const topics = [...DEVOTIONAL_TOPICS].map((slug) => JSON.parse(readFileSync(new URL(`${slug}.json`, topicDir), 'utf8')) as TopicFile);
  const list = chooseDailyVerses(topics, bsbPassageText());
  const output = new URL('../apps/web/public/daily-verses.json', import.meta.url);

  writeFileSync(output, JSON.stringify(list));
  console.log(`Wrote ${list.length} passages to ${fileURLToPath(output)}.`);
}

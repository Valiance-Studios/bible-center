/**
 * Builds the static topic data the topic pages load, from OpenBible.info's topic votes (CC BY):
 * one JSON file per topic in `apps/web/public/topic-data`, and `_index.json` listing every topic's name.
 * No slug starts with an underscore, so the list never collides with a topic.
 *
 * Usage: npm run topic-data (run again to refresh from OpenBible, and commit the result)
 *
 * The source holds only topic names, verse ids and vote counts, with no scripture text.
 * See "OpenBible Data" in ARCHITECTURE.md.
 */
import type {TopicFile, TopicFileVerse} from '../packages/core/src/topics.ts';

import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {normalizeTopicName, topicSlug, topicVerseKey} from '../packages/core/src/topics.ts';
import {parseVerseId} from '../packages/core/src/verseId.ts';

const SOURCE_URL = 'https://a.openbible.info/data/topic-votes.txt';

/** Fewer topics than this means a truncated or changed download, which must not replace the published data. */
const MIN_EXPECTED_TOPICS = 5000;

/** `Topic<tab>Start Verse ID<tab>End Verse ID<tab>Votes`, where the end is blank for a single verse. */
const ROW = /^([^\t]+)\t(\d{8})\t(\d{8})?\t(\d+)$/;

interface TopicBuild {
  /** Each spelling's total votes, to name the topic by its most-voted spelling. */
  names: Map<string, number>;
  verses: Map<string, TopicFileVerse>;
}

function isValidSpan(startVerse: string, endVerse: string): boolean {
  return parseVerseId(startVerse) !== null && parseVerseId(endVerse) !== null && startVerse <= endVerse;
}

/**
 * Topics keyed by slug, from the source's rows. Spellings that share a slug, such as "self control" and
 * "self-control", become one topic, keeping a passage's higher vote count where both list it.
 * Rows that are not votes, such as the header, or that name a verse that does not exist, are skipped.
 */
export function parseTopicVotes(source: string): Map<string, TopicFile> {
  const builds = new Map<string, TopicBuild>();

  for (const line of source.split(/\r?\n/)) {
    const match = ROW.exec(line);

    if (!match) {
      continue;
    }

    const [, rawName = '', startVerse = '', rawEnd, rawVotes = '0'] = match;
    const endVerse = rawEnd ?? startVerse;
    const votes = Number(rawVotes);
    const name = normalizeTopicName(rawName);
    const slug = topicSlug(name);

    if (!slug || votes <= 0 || !isValidSpan(startVerse, endVerse)) {
      continue;
    }

    const build = builds.get(slug) ?? {names: new Map(), verses: new Map()};
    const key = topicVerseKey(startVerse, endVerse);
    const existing = build.verses.get(key);

    build.names.set(name, (build.names.get(name) ?? 0) + votes);

    if (!existing || existing[2] < votes) {
      build.verses.set(key, [startVerse, endVerse, votes]);
    }

    builds.set(slug, build);
  }

  return new Map([...builds].map(([slug, {names, verses}]) => {
    const [name = slug] = [...names].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [];
    const sorted = [...verses.values()].sort((a, b) => b[2] - a[2] || a[0].localeCompare(b[0]));

    return [slug, {name, verses: sorted}];
  }));
}

if (import.meta.main) {
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Could not download ${SOURCE_URL}: ${response.status}`);
  }

  const topics = parseTopicVotes(await response.text());

  if (topics.size < MIN_EXPECTED_TOPICS) {
    throw new Error(`Only ${topics.size} topics were read from ${SOURCE_URL}, so the data was left unchanged.`);
  }

  const outputDir = new URL('../apps/web/public/topic-data/', import.meta.url);

  rmSync(outputDir, {recursive: true, force: true});
  mkdirSync(outputDir, {recursive: true});

  for (const [slug, topic] of topics) {
    writeFileSync(new URL(`${slug}.json`, outputDir), JSON.stringify(topic));
  }

  // Every topic's name, for the Topics page and for spotting a search that names a topic.
  const names = [...topics.values()].map(({name}) => name).sort((a, b) => a.localeCompare(b));

  writeFileSync(new URL('_index.json', outputDir), JSON.stringify(names));

  console.log(`Wrote ${topics.size} topics to ${fileURLToPath(outputDir)}.`);
}

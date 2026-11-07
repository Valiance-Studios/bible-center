/**
 * Builds the static Bible text the reader loads: one JSON file per chapter of each translation.
 *
 * Usage: npm run bible-data (run again to change a source, and commit the result)
 *
 * Only public-domain text may be added here, since the output is committed to a public repository.
 * See "Translations" and "ESV Rules" in ARCHITECTURE.md.
 */
import type {ChapterText, Verse} from '../packages/core/src/bibleBooks.ts';

import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BIBLE_BOOKS} from '../packages/core/src/bibleBooks.ts';

interface Source {
  id: string;
  url: string;
  clean: (text: string) => string;
}

const SOURCES: Source[] = [
  {id: 'bsb', url: 'https://bereanbible.com/bsb.txt', clean: (text) => text},
  // This edition brackets the words its translators added, which print editions set in italics.
  {id: 'kjv', url: 'https://openbible.com/textfiles/kjv.txt', clean: (text) => text.replaceAll(/[[\]]/g, '')},
];

/** The sources name the book of Psalms by its singular. */
const SOURCE_BOOK_NAMES: Record<string, string> = {Psalm: 'Psalms'};

const VERSE_LINE = /^(.+) (\d+):(\d+)\t(.*)$/;

/** Chapters keyed by `<book name> <chapter>`, from `Book chapter:verse<tab>text` lines. Anything else is skipped. */
export function parseSource(source: string, clean: (text: string) => string): Map<string, ChapterText> {
  const chapters = new Map<string, ChapterText>();

  for (const line of source.split(/\r?\n/)) {
    const match = VERSE_LINE.exec(line);

    if (!match) {
      continue;
    }

    const [, book = '', chapter, verse, rawText = ''] = match;
    const text = clean(rawText).trim();

    // A blank verse is one the translation omits, such as Matthew 17:21 in the BSB.
    if (text) {
      const key = `${SOURCE_BOOK_NAMES[book] ?? book} ${chapter}`;
      const parsed: Verse = {verse: Number(verse), text};
      const existing = chapters.get(key);

      if (existing) {
        existing.verses.push(parsed);
      } else {
        chapters.set(key, {verses: [parsed]});
      }
    }
  }

  return chapters;
}

/** Names every chapter of the canon a source is missing, so a bad download cannot be published. */
export function findMissingChapters(chapters: Map<string, ChapterText>): string[] {
  return BIBLE_BOOKS.flatMap((book) => Array.from({length: book.chapters}, (_, index) => `${book.name} ${index + 1}`))
    .filter((key) => !chapters.has(key));
}

async function buildTranslation({id, url, clean}: Source, outputDir: URL): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${response.status}`);
  }

  const chapters = parseSource(await response.text(), clean);
  const missing = findMissingChapters(chapters);

  if (missing.length > 0) {
    throw new Error(`${id} is missing ${missing.length} chapters, starting with ${missing[0]}.`);
  }

  const translationDir = new URL(`${id}/`, outputDir);

  rmSync(translationDir, {recursive: true, force: true});

  for (const book of BIBLE_BOOKS) {
    const bookDir = new URL(`${book.slug}/`, translationDir);

    mkdirSync(bookDir, {recursive: true});

    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      writeFileSync(new URL(`${chapter}.json`, bookDir), JSON.stringify(chapters.get(`${book.name} ${chapter}`)));
    }
  }

  console.log(`Wrote ${chapters.size} chapters of ${id} to ${fileURLToPath(translationDir)}.`);
}

if (import.meta.main) {
  const outputDir = new URL('../apps/web/public/bible/', import.meta.url);

  for (const source of SOURCES) {
    await buildTranslation(source, outputDir);
  }
}

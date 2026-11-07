import type {BibleBook} from './bibleBooks.ts';

import {BIBLE_BOOKS} from './bibleBooks.ts';

/** A verse, a range of verses, or whole chapters. Without verses it covers the chapters in full. */
export interface VerseReference {
  book: BibleBook;
  startChapter: number;
  startVerse: number | null;
  endChapter: number;
  endVerse: number | null;
}

/** Common abbreviations beyond a book's full name. Avoids words like "is", "am" and "so" that could begin a phrase. */
const ABBREVIATIONS: Record<string, readonly string[]> = {
  'Genesis': ['gen', 'ge', 'gn'],
  'Exodus': ['exo', 'ex', 'exod'],
  'Leviticus': ['lev', 'lv'],
  'Numbers': ['num', 'nm', 'nb'],
  'Deuteronomy': ['deut', 'dt', 'deu'],
  'Joshua': ['josh', 'jos'],
  'Judges': ['judg', 'jdg'],
  'Ruth': ['rth', 'ru'],
  '1 Samuel': ['1sam', '1sa'],
  '2 Samuel': ['2sam', '2sa'],
  '1 Kings': ['1kgs', '1ki'],
  '2 Kings': ['2kgs', '2ki'],
  '1 Chronicles': ['1chr', '1ch', '1chron'],
  '2 Chronicles': ['2chr', '2ch', '2chron'],
  'Ezra': ['ezr'],
  'Nehemiah': ['neh'],
  'Esther': ['est', 'esth'],
  'Job': ['jb'],
  'Psalms': ['psalm', 'ps', 'psa', 'pss'],
  'Proverbs': ['prov', 'pro', 'prv', 'proverb'],
  'Ecclesiastes': ['eccl', 'ecc', 'qoh'],
  'Song of Solomon': ['song', 'songofsongs', 'sos', 'songs'],
  'Isaiah': ['isa'],
  'Jeremiah': ['jer'],
  'Lamentations': ['lam'],
  'Ezekiel': ['ezek', 'eze'],
  'Daniel': ['dan', 'dn'],
  'Hosea': ['hos'],
  'Joel': ['jl'],
  'Amos': ['amo'],
  'Obadiah': ['obad', 'ob'],
  'Jonah': ['jon', 'jnh'],
  'Micah': ['mic'],
  'Nahum': ['nah'],
  'Habakkuk': ['hab'],
  'Zephaniah': ['zeph', 'zep'],
  'Haggai': ['hag'],
  'Zechariah': ['zech', 'zec'],
  'Malachi': ['mal'],
  'Matthew': ['matt', 'mt'],
  'Mark': ['mk', 'mrk'],
  'Luke': ['lk', 'luk'],
  'John': ['jn', 'jhn'],
  'Acts': ['act'],
  'Romans': ['rom', 'rm'],
  '1 Corinthians': ['1cor', '1co'],
  '2 Corinthians': ['2cor', '2co'],
  'Galatians': ['gal'],
  'Ephesians': ['eph'],
  'Philippians': ['phil', 'php'],
  'Colossians': ['col'],
  '1 Thessalonians': ['1thess', '1th'],
  '2 Thessalonians': ['2thess', '2th'],
  '1 Timothy': ['1tim', '1ti'],
  '2 Timothy': ['2tim', '2ti'],
  'Titus': ['tit'],
  'Philemon': ['phlm', 'phm', 'philem'],
  'Hebrews': ['heb'],
  'James': ['jas', 'jm'],
  '1 Peter': ['1pet', '1pe'],
  '2 Peter': ['2pet', '2pe'],
  '1 John': ['1jn', '1jhn', '1john'],
  '2 John': ['2jn', '2jhn', '2john'],
  '3 John': ['3jn', '3jhn', '3john'],
  'Jude': ['jud'],
  'Revelation': ['rev', 'revelations', 'rv'],
};

/** Lowercase, without spaces or periods, so `1 Cor.` and `1cor` read alike. */
function bookKey(text: string): string {
  return text.toLowerCase().replaceAll(/[\s.]/g, '');
}

const BOOKS_BY_KEY = new Map<string, BibleBook>(BIBLE_BOOKS.flatMap((book) => [
  [bookKey(book.name), book] as const,
  ...(ABBREVIATIONS[book.name] ?? []).map((abbreviation) => [abbreviation, book] as const),
]));

/** An optional book, then the numbers: `1 Cor 13:4-7`, `Psalm 23`, or just `2:3` to continue the last book. */
const SEGMENT = /^(?:((?:[1-3]\s*)?[a-z.]+(?:\s+[a-z.]+)*)\s*)?(\d[\d\s:,\-–—]*)$/i;
const SINGLE_OR_RANGE = /^(\d+)(?::(\d+))?(?:[-–—](?:(\d+):)?(\d+))?$/;

function toInt(text: string | undefined): number | null {
  return text === undefined ? null : Number(text);
}

/** One `chapter:verse-chapter:verse` term, or null if it does not exist or runs backwards. */
function parseTerm(book: BibleBook, term: string, contextChapter: number | null): VerseReference | null {
  const match = SINGLE_OR_RANGE.exec(term);

  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const firstVerse = toInt(match[2]);
  const endChapterPart = toInt(match[3]);
  const endPart = toInt(match[4]);
  let reference: VerseReference;

  if (firstVerse !== null) {
    // `1:1`, `1:1-5`, `1:1-2:3`
    reference = {book, startChapter: first, startVerse: firstVerse, endChapter: endChapterPart ?? first, endVerse: endPart ?? firstVerse};
  } else if (endChapterPart !== null) {
    return null; // `1-2:3` names a chapter and then a verse, which reads as neither.
  } else if (contextChapter !== null) {
    // After a comma, as the `3` and `5-7` in `John 1:1, 3, 5-7`.
    reference = {book, startChapter: contextChapter, startVerse: first, endChapter: contextChapter, endVerse: endPart ?? first};
  } else if (book.chapters === 1) {
    // Books of one chapter are cited by verse, as in `Jude 5`.
    reference = {book, startChapter: 1, startVerse: first, endChapter: 1, endVerse: endPart ?? first};
  } else {
    reference = {book, startChapter: first, startVerse: null, endChapter: endPart ?? first, endVerse: null};
  }

  const {startChapter, startVerse, endChapter, endVerse} = reference;
  const isInBook = startChapter >= 1 && endChapter <= book.chapters;
  const isForward = endChapter > startChapter || (endChapter === startChapter && (endVerse ?? 0) >= (startVerse ?? 0));
  const versesExist = (startVerse === null || startVerse >= 1) && (endVerse === null || endVerse >= 1);

  return isInBook && isForward && versesExist ? reference : null;
}

/**
 * Reads a search as Bible references, such as `John 1:1`, `John 1:1-5` or
 * `John 1:1; Acts 2:3-4; Revelation 22:13`. Returns null unless all of it is valid references,
 * so that anything else can be searched as a phrase. Verse numbers are only checked against
 * the text once it loads, since they vary by chapter and translation.
 */
export function parseReferences(query: string): VerseReference[] | null {
  const segments = query.split(';').map((segment) => segment.trim()).filter(Boolean);
  const references: VerseReference[] = [];
  let book: BibleBook | null = null;

  if (segments.length === 0) {
    return null;
  }

  for (const segment of segments) {
    const match = SEGMENT.exec(segment);

    if (!match) {
      return null;
    }

    if (match[1]) {
      book = BOOKS_BY_KEY.get(bookKey(match[1])) ?? null;
    }

    if (!book) {
      return null;
    }

    let contextChapter: number | null = null;

    for (const rawTerm of (match[2] ?? '').split(',')) {
      const reference = parseTerm(book, rawTerm.replaceAll(/\s/g, ''), contextChapter);

      if (!reference) {
        return null;
      }

      references.push(reference);
      contextChapter = reference.startVerse === null ? null : reference.endChapter;
    }
  }

  return references;
}

/** How to display a reference, such as `John 1:1–5` or `Psalm 23`. */
export function formatReference({book, startChapter, startVerse, endChapter, endVerse}: VerseReference): string {
  const isSinglePsalm = book.name === 'Psalms' && startChapter === endChapter;
  const name = isSinglePsalm ? 'Psalm' : book.name;

  if (startVerse === null) {
    return startChapter === endChapter ? `${name} ${startChapter}` : `${name} ${startChapter}–${endChapter}`;
  }

  if (startChapter !== endChapter) {
    return `${name} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
  }

  return startVerse === endVerse ? `${name} ${startChapter}:${startVerse}` : `${name} ${startChapter}:${startVerse}–${endVerse}`;
}

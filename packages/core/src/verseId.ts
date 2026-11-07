/** A verse's place in the 66-book canon, independent of any translation. */
export interface VerseLocation {
  /** 1 (Genesis) to 66 (Revelation). */
  book: number;
  chapter: number;
  verse: number;
}

/**
 * A verse as an eight-digit `bbcccvvv` string, e.g. `43001001` for John 1:1. Annotations and votes are
 * keyed by this rather than by verse text, so they carry across translations. It is the format OpenBible's
 * data already uses, and it sorts in canonical order as a plain string.
 */
export type VerseId = string;

const VERSE_ID_PATTERN = /^(\d{2})(\d{3})(\d{3})$/;
const BOOK_COUNT = 66;
const MAX_CHAPTER_OR_VERSE = 999;

function isValidLocation({book, chapter, verse}: VerseLocation): boolean {
  return [book, chapter, verse].every(Number.isInteger)
    && book >= 1 && book <= BOOK_COUNT
    && chapter >= 1 && chapter <= MAX_CHAPTER_OR_VERSE
    && verse >= 1 && verse <= MAX_CHAPTER_OR_VERSE;
}

export function formatVerseId(location: VerseLocation): VerseId {
  if (!isValidLocation(location)) {
    throw new RangeError(`Not a valid verse location: ${JSON.stringify(location)}`);
  }

  const {book, chapter, verse} = location;

  return `${String(book).padStart(2, '0')}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}`;
}

/** The location of a verse id, or null if the id is malformed or out of range. */
export function parseVerseId(id: VerseId): VerseLocation | null {
  const match = VERSE_ID_PATTERN.exec(id);

  if (!match) {
    return null;
  }

  const location = {book: Number(match[1]), chapter: Number(match[2]), verse: Number(match[3])};

  return isValidLocation(location) ? location : null;
}

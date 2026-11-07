/** The translations a word can be limited to, when the Greek they follow differs. */
export type WordTranslation = 'bsb' | 'kjv';

/** The original language of a chapter's words. */
export type WordFileLanguage = 'hebrew' | 'greek';

/**
 * One original-language word in a chapter's word file, in the order of the text, numbered by the BSB.
 * Hebrew words belong to every translation. A Greek word found in only one translation's Greek text
 * names it in `only`, and a word the KJV numbers in a different verse gives that verse in `kjvVerse`.
 */
export type WordFileWord = [
  verse: number,
  text: string,
  transliteration: string,
  english: string,
  /** A disambiguated Strong's number, such as `H7462B`. Empty for a word with none. */
  strongs: string,
  /** A STEPBible morphology code, such as `HVqrmsc`. */
  grammar: string,
  only?: WordTranslation | null,
  kjvVerse?: number,
];

/** One chapter's original-language words, written by `scripts/build-word-data.ts`. */
export interface WordFile {
  language: WordFileLanguage;
  words: WordFileWord[];
}

/** A dictionary entry for a word's root, from STEPBible's brief lexicons. */
export interface LexiconEntry {
  /** The dictionary form, such as רָעָה or λόγος. */
  lemma: string;
  transliteration: string;
  /** A word or two, such as "to pasture". */
  gloss: string;
  /** Its main senses, in a sentence. */
  meaning: string;
}

/** A lexicon file: the entries whose Strong's numbers share a group, by number. */
export type LexiconFile = Record<string, LexiconEntry>;

/** A grammar file: plain-English descriptions of a language's morphology codes. */
export type GrammarFile = Record<string, string>;

/**
 * The group of a Strong's number's lexicon file, such as `H74` for `H7462B`: its language letter and
 * its number in hundreds. Null for something that is not a Strong's number.
 */
export function lexiconGroup(strongs: string): string | null {
  const match = /^([HG])(\d+)/.exec(strongs);

  return match ? `${match[1]}${String(Math.floor(Number(match[2]) / 100)).padStart(2, '0')}` : null;
}

/** One word of a verse, in the order of the text. */
export interface VerseWord {
  text: string;
  transliteration: string;
  english: string;
  strongs: string;
  grammar: string;
}

/** A verse's original-language words, as the given translation numbers and follows them. */
export function wordsOfVerse(file: WordFile, translation: WordTranslation, verse: number): VerseWord[] {
  return file.words
    .filter(([bsbVerse, , , , , , only, kjvVerse]) => {
      const numbered = translation === 'kjv' ? kjvVerse ?? bsbVerse : bsbVerse;

      return numbered === verse && (!only || only === translation);
    })
    .map(([, text, transliteration, english, strongs, grammar]) => ({text, transliteration, english, strongs, grammar}));
}

/** The language a verse's words are in. The Old Testament's Aramaic passages are in Daniel and Ezra. */
export type WordLanguage = 'Hebrew' | 'Aramaic' | 'Hebrew and Aramaic' | 'Greek';

/**
 * The language of a verse's words. In STEPBible's Old Testament morphology, codes for Aramaic words start
 * with `A` and Hebrew ones with `H`. Daniel 2:4 and Ezra 4:8 change from one to the other partway through.
 */
export function languageOfWords(language: WordFileLanguage, words: readonly VerseWord[]): WordLanguage {
  if (language === 'greek') {
    return 'Greek';
  }

  const hasAramaic = words.some(({grammar}) => grammar.startsWith('A'));
  const hasHebrew = words.some(({grammar}) => grammar.startsWith('H'));

  return hasAramaic ? (hasHebrew ? 'Hebrew and Aramaic' : 'Aramaic') : 'Hebrew';
}

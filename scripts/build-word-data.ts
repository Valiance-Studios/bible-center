/**
 * Builds the static original-language data the reader's word panel loads, in `apps/web/public/word-data`:
 * `<book>/<chapter>.json` with each chapter's Hebrew or Greek words, `_lexicon/<group>.json` with the dictionary
 * entries by Strong's number in hundreds (see `lexiconGroup`), and `_grammar/<language>.json` describing the
 * morphology codes. No book slug starts with an underscore.
 *
 * Usage: npm run word-data (run again after changing STEPBIBLE_COMMIT, and commit the result)
 *
 * The data is STEPBible's, from Tyndale House, under CC BY 4.0, which asks for a note of any changes. This
 * script keeps the words' text, transliteration, English, Strong's numbers and grammar; removes Hebrew
 * cantillation marks and STEPBible's prefix and suffix dividers; numbers the words as the BSB and KJV do,
 * folding Psalm titles (verse 0) into verse 1; and shortens lexicon definitions to their main senses.
 * See "Original Languages" in ARCHITECTURE.md.
 */
import type {GrammarFile, LexiconEntry, LexiconFile, WordFile, WordFileWord, WordTranslation} from '../packages/core/src/words.ts';

import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BIBLE_BOOKS} from '../packages/core/src/bibleBooks.ts';
import {lexiconGroup} from '../packages/core/src/words.ts';

/** A fixed version of STEPBible-Data, so rebuilding gives the same output until this is changed. */
const STEPBIBLE_COMMIT = '5de0a47f35f0fc13dfe1430d104e5db8a4285f9c';
const STEPBIBLE_URL = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${STEPBIBLE_COMMIT}`;

const TAHOT = 'Translators Amalgamated OT+NT/TAHOT {part} - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt';
const TAGNT = 'Translators Amalgamated OT+NT/TAGNT {part} - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt';
const SOURCES = {
  hebrew: ['Gen-Deu', 'Jos-Est', 'Job-Sng', 'Isa-Mal'].map((part) => TAHOT.replace('{part}', part)),
  greek: ['Mat-Jhn', 'Act-Rev'].map((part) => TAGNT.replace('{part}', part)),
  hebrewLexicon: 'Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt',
  greekLexicon: 'Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
  hebrewGrammar: 'Morphology codes/TEHMC - Translators Expansion of Hebrew Morphology Codes - STEPBible.org CC BY.txt',
  greekGrammar: 'Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt',
};

/** STEPBible's book abbreviations, in the canonical order of `BIBLE_BOOKS`. */
const BOOK_CODES = [
  'Gen', 'Exo', 'Lev', 'Num', 'Deu', 'Jos', 'Jdg', 'Rut', '1Sa', '2Sa', '1Ki', '2Ki', '1Ch', '2Ch', 'Ezr', 'Neh', 'Est',
  'Job', 'Psa', 'Pro', 'Ecc', 'Sng', 'Isa', 'Jer', 'Lam', 'Ezk', 'Dan', 'Hos', 'Jol', 'Amo', 'Oba', 'Jon', 'Mic', 'Nam',
  'Hab', 'Zep', 'Hag', 'Zec', 'Mal', 'Mat', 'Mrk', 'Luk', 'Jhn', 'Act', 'Rom', '1Co', '2Co', 'Gal', 'Eph', 'Php', 'Col',
  '1Th', '2Th', '1Ti', '2Ti', 'Tit', 'Phm', 'Heb', 'Jas', '1Pe', '2Pe', '1Jn', '2Jn', '3Jn', 'Jud', 'Rev',
];
const BOOK_SLUGS = new Map(BOOK_CODES.map((code, index) => [code, BIBLE_BOOKS[index]?.slug ?? '']));

/** Fewer words than these means a truncated or changed download, which must not replace the published data. */
const MIN_EXPECTED_WORDS = {hebrew: 300_000, greek: 130_000};
/** How many of a lexicon entry's senses to keep. */
const MAX_SENSES = 3;

/** A word row: `Book.chapter.verse`, an optional bracketed alternative numbering, `#word=type`, then tab-separated fields. */
const WORD_ROW = /^([1-3]?[A-Z][a-z]+)\.(\d+)\.(\d+)((?:[([{][^\])}]*[\])}])*)#\d+=([^\t]+)\t/;
/** Hebrew cantillation marks, which the panel leaves out. Vowel points stay. */
const CANTILLATION = /[֑-ֽ֯]/g;

/** The words of one chapter, keyed by `<book slug>/<chapter>`. */
export type ChapterWords = Map<string, WordFileWord[]>;

interface ParsedRow {
  /** STEPBible's book abbreviation, such as `Jhn`. */
  code: string;
  slug: string;
  chapter: number;
  verse: number;
  /** Alternative numberings, such as `[2.13]` for the KJV. */
  alternatives: string;
  type: string;
  fields: string[];
}

function parseRow(line: string): ParsedRow | null {
  const match = WORD_ROW.exec(line);

  if (!match) {
    return null;
  }

  const [, code = '', chapter = '', verse = '', alternatives = '', type = ''] = match;
  const slug = BOOK_SLUGS.get(code);

  if (!slug) {
    throw new Error(`Unknown STEPBible book code "${code}".`);
  }

  return {code, slug, chapter: Number(chapter), verse: Number(verse), alternatives, type, fields: line.split('\t')};
}

function addWord(chapters: ChapterWords, slug: string, chapter: number, word: WordFileWord) {
  const key = `${slug}/${chapter}`;
  const words = chapters.get(key);

  if (words) {
    words.push(word);
  } else {
    chapters.set(key, [word]);
  }
}

/**
 * STEPBible marks stressed syllables with capitals, divides syllables with dots, and divides prefixes and
 * suffixes with `/`. A name, the element at `nameIndex`, keeps a capital, as in "Yahweh" and "leDavid".
 */
export function cleanTransliteration(text: string, nameIndex: number | null = null): string {
  return text.split('/')
    .map((part, index) => {
      const plain = part.replaceAll('.', '').toLowerCase();

      return index === nameIndex ? plain.charAt(0).toUpperCase() + plain.slice(1) : plain;
    })
    .join('');
}

/**
 * `/` separates the English of prefixes and suffixes, as in "[is] shepherd/ my"; a word that starts a verse
 * in another numbering is marked with that verse, as in "[13.1] And"; the Greek English keeps the text's
 * punctuation, as in "Word,"; and angle brackets mark a word left untranslated, as in "<the>".
 */
export function cleanEnglish(text: string): string {
  const plain = text.replace(/^\[\d+(?:\.\d+)?\]\s*/, '').replaceAll('/', ' ').replaceAll(/\s+/g, ' ').trim().replace(/[,.;:·]+$/, '');
  const untranslated = /^<(.+)>$/.exec(plain);

  return untranslated ? `${untranslated[1]} (not translated)` : plain;
}

/**
 * Hebrew words from a TAHOT file. Each word's grammar is its root's, the element its Strong's numbers
 * mark with braces, as in `H9005/{H1732}`. Psalm titles, numbered verse 0, join verse 1.
 */
export function parseHebrewWords(source: string, chapters: ChapterWords = new Map()): ChapterWords {
  for (const line of source.split(/\r?\n/)) {
    const row = parseRow(line);

    if (!row) {
      continue;
    }

    const [, hebrew = '', transliteration = '', english = '', strongsField = '', grammarField = ''] = row.fields;
    const strongsParts = strongsField.split(/[/\\]/);
    const rootIndex = Math.max(0, strongsParts.findIndex((part) => part.startsWith('{')));
    const strongs = /\{(H\d+[A-Za-z]?)\}/.exec(strongsField)?.[1] ?? '';
    const grammarParts = grammarField.split('/');
    // Only the first element carries the language letter: H for Hebrew, A for Aramaic.
    const language = grammarField.charAt(0);
    const rootGrammar = grammarParts[rootIndex] ?? grammarParts[0] ?? '';
    const grammar = rootIndex === 0 ? rootGrammar : `${language}${rootGrammar}`;
    // A backslash separates punctuation, such as the verse-ending ׃, from the word.
    const text = (hebrew.split('\\')[0] ?? '').replaceAll('/', '').replaceAll(CANTILLATION, '');

    const nameIndex = /^[HA]Np/.test(grammar) ? rootIndex : null;

    addWord(chapters, row.slug, row.chapter, [Math.max(1, row.verse), text, cleanTransliteration(transliteration, nameIndex), cleanEnglish(english), strongs, grammar]);
  }

  return chapters;
}

/** Which translations' Greek has the word: N (Nestle-Aland, the BSB's) and K (the KJV's), in either case, outside brackets. */
function translationsOf(type: string): WordTranslation[] {
  const editions = type.replaceAll(/\([^)]*\)/g, '').toLowerCase();

  return [...(editions.includes('n') ? ['bsb' as const] : []), ...(editions.includes('k') ? ['kjv' as const] : [])];
}

/** A verse as STEPBible's Greek numbers it, such as `Act.5.39`, before any bracketed alternative. */
type GreekRef = `${string}.${number}.${number}`;

/**
 * Where STEPBible numbers by the NRSV but the BSB, like the KJV, puts the words in the next or previous verse.
 * Found by comparing the BSB's verses with the words' English at each place the KJV differs.
 */
const BSB_FOLLOWS_KJV = new Set<GreekRef>([
  'Act.5.39', 'Act.24.19', 'Rom.7.10', '2Co.10.4', '2Co.13.12', '2Co.13.13', 'Gal.2.19', 'Eph.5.14', 'Php.2.7', '1Th.1.2',
  '1Th.2.7', 'Heb.3.10', 'Heb.12.22', '1Pe.3.16', '1Jn.2.14', '3Jn.1.15', 'Rev.2.28', 'Rev.12.18', 'Rev.17.9', 'Luk.7.18',
]);

/**
 * The KJV's word where its Greek, the Textus Receptus, reads differently from Nestle-Aland, from a row's
 * meaning variants, such as `υἱός (T=huios) son - G5207=N-NSM in: Tyn+TR+Byz`. Variants are separated by `¦`,
 * and one covering several words gives the first word's Strong's number and grammar.
 */
export function kjvVariantOf(variants: string): {greek: string; transliteration: string; english: string; strongs: string; grammar: string} | null {
  for (const variant of variants.split('¦')) {
    const match = /^\s*(.+?) \((?:\w=)?([^)]*)\) (.*?) - ([HG]\d+[A-Za-z]?)=(\S+).* in: (.*)$/.exec(variant);

    if (match && match[6]?.split('+').map((edition) => edition.trim()).includes('TR')) {
      const [, greek = '', transliteration = '', english = '', strongs = '', grammar = ''] = match;

      return {greek, transliteration, english, strongs, grammar};
    }
  }

  return null;
}

/** Passages Nestle-Aland brackets but the BSB translates: the longer ending of Mark and the woman caught in adultery. */
function isBracketedPassageInBsb(code: string, chapter: number, verse: number): boolean {
  return (code === 'Mrk' && chapter === 16 && verse >= 9)
    || (code === 'Jhn' && ((chapter === 7 && verse === 53) || (chapter === 8 && verse <= 11)));
}

/**
 * Greek words from a TAGNT file. Words found only in other editions are skipped. Square brackets give the
 * KJV's verse when it numbers the word differently, which is in another chapter only at Revelation 12:18.
 */
export function parseGreekWords(source: string, chapters: ChapterWords = new Map()): ChapterWords {
  for (const line of source.split(/\r?\n/)) {
    const row = parseRow(line);

    if (!row) {
      continue;
    }

    const translations = translationsOf(row.type);

    if (translations.includes('kjv') && !translations.includes('bsb') && isBracketedPassageInBsb(row.code, row.chapter, row.verse)) {
      translations.push('bsb');
    }

    // An uppercase K in brackets means the KJV's Greek has a different word here, given among the variants.
    const kjvVariant = /\([^)]*K[^)]*\)/.test(row.type) ? kjvVariantOf(row.fields[6] ?? '') : null;

    if (/\([^)]*K[^)]*\)/.test(row.type) && !kjvVariant && !translations.includes('kjv')) {
      translations.push('kjv');
    }

    if (translations.length === 0) {
      continue;
    }

    const [, greekField = '', english = '', strongsAndGrammar = ''] = row.fields;
    const [, bracketed = greekField, transliteration = ''] = /^(.*?) \((.*)\)$/.exec(greekField) ?? [];
    // Double brackets mark passages Nestle-Aland doubts, such as the longer ending of Mark.
    const greek = bracketed.replaceAll(/\[\[|\]\]/g, '');
    const [strongs = '', grammar = ''] = strongsAndGrammar.split('=');
    const kjvMatch = /\[(\d+)\.(\d+)\]/.exec(row.alternatives);
    const kjv = kjvMatch ? {chapter: Number(kjvMatch[1]), verse: Number(kjvMatch[2])} : {chapter: row.chapter, verse: row.verse};
    const bsb = BSB_FOLLOWS_KJV.has(`${row.code}.${row.chapter}.${row.verse}`) ? kjv : {chapter: row.chapter, verse: row.verse};
    const details = [greek, transliteration, cleanEnglish(english), strongs, grammar] as const;
    const only = translations.length === 1 ? translations[0] : null;

    // A word the two number in different chapters goes in each chapter's file for its own translation.
    if (bsb.chapter !== kjv.chapter) {
      if (translations.includes('bsb')) {
        addWord(chapters, row.slug, bsb.chapter, [bsb.verse, ...details, 'bsb']);
      }

      if (translations.includes('kjv')) {
        addWord(chapters, row.slug, kjv.chapter, [kjv.verse, ...details, 'kjv']);
      }

      continue;
    }

    const word: WordFileWord = [bsb.verse, ...details];

    if (only || kjv.verse !== bsb.verse) {
      word.push(only);
    }

    if (kjv.verse !== bsb.verse) {
      word.push(kjv.verse);
    }

    addWord(chapters, row.slug, bsb.chapter, word);

    if (kjvVariant) {
      const {greek: kjvGreek, transliteration: kjvTransliteration, english: kjvEnglish, strongs: kjvStrongs, grammar: kjvGrammar} = kjvVariant;
      const variantWord: WordFileWord = [bsb.verse, kjvGreek, kjvTransliteration, cleanEnglish(kjvEnglish), kjvStrongs, kjvGrammar, 'kjv'];

      if (kjv.verse !== bsb.verse) {
        variantWord.push(kjv.verse);
      }

      addWord(chapters, row.slug, kjv.chapter, variantWord);
    }
  }

  return chapters;
}

function stripHtml(text: string): string {
  return text.replaceAll(/<[^>]*>/g, '').replaceAll(/\s+/g, ' ').trim();
}

/**
 * A definition's main senses. Hebrew definitions number them `1)`, `2)`; Greek ones set them in bold
 * after the headword. Anything else keeps its first line.
 */
export function mainSenses(definition: string, lemma: string): string {
  const lines = definition.split(/<br\s*\/?>/i).map(stripHtml).filter(Boolean);
  const numbered = lines.flatMap((line) => /^\d+\)\s*(.+)$/.exec(line)?.[1] ?? []);
  const bold = [...definition.matchAll(/<b>(.*?)<\/b>/gi)].map(([, text = '']) => stripHtml(text)).filter((text) => text && text !== lemma);
  const senses = numbered.length > 0 ? numbered : bold.length > 0 ? bold : lines.slice(0, 1);

  return [...new Set(senses.map((sense) => sense.replace(/[,;:.\s]+$/, '')))].slice(0, MAX_SENSES).join('; ');
}

/** Lexicon entries by disambiguated Strong's number, from TBESH or TBESG, and by plain number for the first sense. */
export function parseLexicon(source: string): Map<string, LexiconEntry> {
  const entries = new Map<string, LexiconEntry>();

  for (const line of source.split(/\r?\n/)) {
    const [, dStrong = '', , lemma = '', transliteration = '', , gloss = '', definition = ''] = line.split('\t');
    const strongs = /^([HG]\d+[A-Za-z]?) =/.exec(dStrong)?.[1];

    if (strongs && lemma && !entries.has(strongs)) {
      const entry = {lemma, transliteration: cleanTransliteration(transliteration), gloss, meaning: mainSenses(definition, lemma)};

      entries.set(strongs, entry);

      // The number's first sense also answers for the plain number, when the lexicon has no entry of its own for it.
      if (!entries.has(baseStrongs(strongs))) {
        entries.set(baseStrongs(strongs), entry);
      }
    }
  }

  return entries;
}

/**
 * Plain-English descriptions of morphology codes, from TEHMC or TEGMC, such as "Verb, Qal, participle,
 * masculine, singular, construct" for `HVqrmsc`.
 */
export function parseGrammar(source: string): Map<string, string> {
  const descriptions = new Map<string, string>();

  for (const line of source.split(/\r?\n/)) {
    const [code = '', expansion = ''] = line.split('\t');

    if (!/^[A-Z][A-Za-z0-9-]*$/.test(code) || !expansion.includes('Function=')) {
      continue;
    }

    // Notes in brackets, such as "(hence Action=Simple; Voice=Active)", hold semicolons of their own.
    const values = expansion.replaceAll(/\(.*?\)/g, '').split(';').flatMap((part) => {
      const [key = '', value = ''] = part.split('=').map((text) => text.trim());

      if (!value) {
        return [];
      }

      // Stems, such as Qal and Piel, are names.
      if (key === 'Stem') {
        return [value];
      }

      return [key === 'Person' ? `${value.toLowerCase()} person` : value.toLowerCase()];
    });
    const [first = ''] = values;

    descriptions.set(code, [first.charAt(0).toUpperCase() + first.slice(1), ...values.slice(1)].join(', '));
  }

  return descriptions;
}

/** A Strong's number without STEPBible's letter that tells apart its senses: H7462 for H7462B. */
function baseStrongs(strongs: string): string {
  return strongs.replace(/[A-Za-z]$/, '');
}

/**
 * The entry for a word's Strong's number. Some words use a plain number, such as G3708, where the lexicon only
 * has its senses, G3708G and G3708H, or the reverse, so those fall back to the number's first entry.
 */
function entryFor(strongs: string, lexicon: ReadonlyMap<string, LexiconEntry>): LexiconEntry | undefined {
  return lexicon.get(strongs) ?? lexicon.get(baseStrongs(strongs));
}

/** The lexicon entries the words use, in files by `lexiconGroup`. */
export function lexiconFiles(chapters: ChapterWords, lexicon: ReadonlyMap<string, LexiconEntry>): Map<string, LexiconFile> {
  const files = new Map<string, LexiconFile>();

  for (const words of chapters.values()) {
    for (const [, , , , strongs] of words) {
      const entry = entryFor(strongs, lexicon);
      const group = lexiconGroup(strongs);

      if (entry && group) {
        files.set(group, {...files.get(group), [strongs]: entry});
      }
    }
  }

  return files;
}

/** The descriptions of the morphology codes the words use. */
export function grammarFile(chapters: ChapterWords, grammar: ReadonlyMap<string, string>): GrammarFile {
  const file: GrammarFile = {};

  for (const words of chapters.values()) {
    for (const [, , , , , code] of words) {
      const description = grammar.get(code);

      if (description) {
        file[code] = description;
      }
    }
  }

  return file;
}

async function download(path: string): Promise<string> {
  const response = await fetch(`${STEPBIBLE_URL}/${path.split('/').map(encodeURIComponent).join('/')}`);

  if (!response.ok) {
    throw new Error(`Could not download ${path}: ${response.status}`);
  }

  return response.text();
}

function countWords(chapters: ChapterWords): number {
  return [...chapters.values()].reduce((total, words) => total + words.length, 0);
}

/**
 * Where the words and a translation's text disagree on the numbering: verses with no words, and words in a
 * verse the translation does not have. Either would leave words that no verse shows.
 */
function numberingProblems(chapters: ChapterWords, translation: WordTranslation): string[] {
  const problems: string[] = [];

  for (const [key, words] of chapters) {
    const path = new URL(`../apps/web/public/bible/${translation}/${key}.json`, import.meta.url);
    const verses = new Set((JSON.parse(readFileSync(path, 'utf8')) as {verses: {verse: number}[]}).verses.map(({verse}) => verse));
    const numbered = new Set(words
      .filter(([, , , , , , only]) => !only || only === translation)
      .map(([verse, , , , , , , kjvVerse]) => (translation === 'kjv' ? kjvVerse ?? verse : verse)));

    problems.push(
      ...[...verses].filter((verse) => !numbered.has(verse)).map((verse) => `${translation} ${key}:${verse} has no words`),
      ...[...numbered].filter((verse) => !verses.has(verse)).map((verse) => `${translation} ${key}:${verse} has words but no text`),
    );
  }

  return problems;
}

function writeJson(path: URL, data: unknown) {
  mkdirSync(new URL('.', path), {recursive: true});
  writeFileSync(path, JSON.stringify(data));
}

async function main() {
  const [hebrewSources, greekSources, hebrewLexicon, greekLexicon, hebrewGrammar, greekGrammar] = await Promise.all([
    Promise.all(SOURCES.hebrew.map(download)),
    Promise.all(SOURCES.greek.map(download)),
    download(SOURCES.hebrewLexicon).then(parseLexicon),
    download(SOURCES.greekLexicon).then(parseLexicon),
    download(SOURCES.hebrewGrammar).then(parseGrammar),
    download(SOURCES.greekGrammar).then(parseGrammar),
  ]);
  const hebrew: ChapterWords = new Map();
  const greek: ChapterWords = new Map();

  hebrewSources.forEach((source) => parseHebrewWords(source, hebrew));
  greekSources.forEach((source) => parseGreekWords(source, greek));

  for (const [language, chapters] of [['hebrew', hebrew], ['greek', greek]] as const) {
    if (countWords(chapters) < MIN_EXPECTED_WORDS[language]) {
      throw new Error(`Only ${countWords(chapters)} ${language} words were read; refusing to replace the data.`);
    }
  }

  const problems = (['bsb', 'kjv'] as const).flatMap((translation) => numberingProblems(new Map([...hebrew, ...greek]), translation));

  if (problems.length > 0) {
    throw new Error(`The words do not match the translations' verses; nothing was written:\n${problems.join('\n')}`);
  }

  const outputDir = new URL('../apps/web/public/word-data/', import.meta.url);

  rmSync(outputDir, {recursive: true, force: true});

  for (const [language, chapters, lexicon, grammar] of [
    ['hebrew', hebrew, hebrewLexicon, hebrewGrammar],
    ['greek', greek, greekLexicon, greekGrammar],
  ] as const) {
    for (const [key, words] of chapters) {
      writeJson(new URL(`${key}.json`, outputDir), {language, words} satisfies WordFile);
    }

    for (const [group, file] of lexiconFiles(chapters, lexicon)) {
      writeJson(new URL(`_lexicon/${group}.json`, outputDir), file);
    }

    writeJson(new URL(`_grammar/${language}.json`, outputDir), grammarFile(chapters, grammar));
  }

  console.log(`Wrote ${hebrew.size + greek.size} chapters to ${fileURLToPath(outputDir)}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

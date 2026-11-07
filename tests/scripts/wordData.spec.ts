import type {LexiconFile, WordFile} from '../../packages/core/src/words.ts';

import {existsSync, readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {BIBLE_BOOKS} from '../../packages/core/src/bibleBooks.ts';
import {lexiconGroup} from '../../packages/core/src/words.ts';
import {
  cleanEnglish,
  grammarFile,
  kjvVariantOf,
  lexiconFiles,
  mainSenses,
  parseGrammar,
  parseGreekWords,
  parseHebrewWords,
  parseLexicon,
} from '../../scripts/build-word-data';

/** Rows as TAHOT has them: reference and type, Hebrew, transliteration, English, Strong's, grammar. */
const PSALM_23 = [
  '# Psa.23.0 (Heb: 23.1a)\tmiz.Mor',
  'Eng (Heb) Ref & Type\tHebrew\tTransliteration\tTranslation\tdStrongs\tGrammar',
  'Psa.23.0(23.1)#01=L\tמִזְמ֥וֹר\tmiz.Mor\ta psalm\t{H4210}\tHNcmsa',
  'Psa.23.0(23.1)#02=L\tלְ/דָוִ֑ד\tle./da.Vid\tof/ David\tH9005/{H1732}\tHR/Npm',
  'Psa.23.1#03=L\tיְהוָ֥ה\tYah.weh\tYahweh\t{H3068G}\tHNpt',
  'Psa.23.1#04=L\tרֹ֝עִ֗/י\tro.\'/I\t[is] shepherd/ my\t{H7462B}/H9020\tHVqrmsc/Sp1bs',
  'Psa.23.1#06=L\tאֶחְסָֽר\\׃\t\'ech.Sar\tI lack\t{H2637}\\H9016\tHVqi1cs',
].join('\n');

/** Rows as TAGNT has them: reference and editions, Greek with transliteration, English, Strong's and grammar. */
function greekRow(ref: string, type: string, greek: string, english: string, strongs = 'G2532=CONJ') {
  return `${ref}=${type}\t${greek}\t${english}\t${strongs}\tκαί=and`;
}

describe('parseHebrewWords', () => {
  const words = parseHebrewWords(PSALM_23).get('psalms/23') ?? [];

  it('folds a Psalm title into verse 1, as the BSB and KJV number it', () => {
    expect(words.map(([verse]) => verse)).toEqual([1, 1, 1, 1, 1]);
  });

  it('drops cantillation, dividers and punctuation, keeping the vowels', () => {
    expect(words.map(([, text]) => text)).toEqual(['מִזְמוֹר', 'לְדָוִד', 'יְהוָה', 'רֹעִי', 'אֶחְסָר']);
  });

  it('keeps the root\'s Strong\'s number and grammar, with the language letter', () => {
    expect(words[1]).toEqual([1, 'לְדָוִד', 'leDavid', 'of David', 'H1732', 'HNpm']);
    expect(words[3]?.slice(3)).toEqual(['[is] shepherd my', 'H7462B', 'HVqrmsc']);
  });

  it('capitalizes names only', () => {
    expect(words.map(([, , transliteration]) => transliteration)).toEqual(['mizmor', 'leDavid', 'Yahweh', 'ro\'i', '\'echsar']);
  });
});

describe('parseGreekWords', () => {
  it('limits a word to the translation whose Greek has it', () => {
    const chapters = parseGreekWords([
      greekRow('Jhn.1.18#05', 'NK(O)', 'μονογενὴς (monogenēs)', '[the] only begotten'),
      greekRow('Jhn.1.18#06', 'N(k)(O)', 'θεὸς (theos)', 'God'),
      greekRow('Jhn.1.18#07', 'K(O)', 'υἱός (huios)', 'Son'),
      greekRow('Jhn.1.18#08', 'O', 'ὁ (ho)', 'the'),
    ].join('\n'));

    expect(chapters.get('john/1')?.map(([, text, , , , , only]) => [text, only ?? null])).toEqual([
      ['μονογενὴς', null],
      ['θεὸς', 'bsb'],
      ['υἱός', 'kjv'],
    ]);
  });

  it('adds the KJV\'s word where its Greek reads differently, from the variants', () => {
    const row = `Jhn.1.18#07=N(K)O\tθεὸς (theos)\tGod\tG2316=N-NSM-T\tθεός=God\tNA28\tυἱός (T=huios) son - G5207=N-NSM in: Tyn+TR+Byz`;

    expect(parseGreekWords(row).get('john/1')?.map(([, text, , english, strongs, , only]) => [text, english, strongs, only])).toEqual([
      ['θεὸς', 'God', 'G2316', 'bsb'],
      ['υἱός', 'son', 'G5207', 'kjv'],
    ]);
  });

  it('picks the variant in the Textus Receptus, among several', () => {
    expect(kjvVariantOf('ἐν (T=en) in - G1722=PREP in: Tyn+TR+Byz ¦ εἰς (o=eis) into - G1519=PREP in: WH+Treg')?.strongs).toBe('G1722');
    expect(kjvVariantOf('εἰς (o=eis) into - G1519=PREP in: WH+Treg')).toBeNull();
  });

  it('keeps the KJV\'s verse where it differs, and the BSB\'s where it follows the KJV', () => {
    const words = parseGreekWords([
      greekRow('Act.4.5[4.6]#20', 'NKO', 'Ἰερουσαλήμ (Ierousalēm)', '[6] in Jerusalem'),
      greekRow('Act.5.39[5.40]#01', 'NKO', 'ἐπείσθησαν (epeisthēsan)', '[40] They were persuaded'),
    ].join('\n'));

    expect(words.get('acts/4')?.[0]).toEqual([5, 'Ἰερουσαλήμ', 'Ierousalēm', 'in Jerusalem', 'G2532', 'CONJ', null, 6]);
    expect(words.get('acts/5')?.[0]).toEqual([40, 'ἐπείσθησαν', 'epeisthēsan', 'They were persuaded', 'G2532', 'CONJ']);
  });

  it('includes the longer ending of Mark for the BSB, without Nestle-Aland\'s brackets', () => {
    const words = parseGreekWords(greekRow('Mrk.16.9#01', 'KO', '[[Ἀναστὰς (Anastas)', 'Having risen')).get('mark/16');

    expect(words?.[0]?.slice(0, 2)).toEqual([9, 'Ἀναστὰς']);
    expect(words?.[0]?.[6]).toBeUndefined();
  });

  it('moves Revelation 12:18 to the start of chapter 13, as the BSB and KJV number it', () => {
    const chapters = parseGreekWords(greekRow('Rev.12.18[13.1]#01', 'NKO', 'καὶ (kai)', '[13.1] And'));

    expect(chapters.has('revelation/12')).toBe(false);
    expect(chapters.get('revelation/13')?.[0]?.slice(0, 4)).toEqual([1, 'καὶ', 'kai', 'And']);
  });
});

describe('cleanEnglish', () => {
  it('joins prefixes and suffixes, and drops verse markers and trailing punctuation', () => {
    expect(cleanEnglish('[is] shepherd/ my')).toBe('[is] shepherd my');
    expect(cleanEnglish('[13] Greet')).toBe('Greet');
    expect(cleanEnglish('Word,')).toBe('Word');
  });

  it('says when a word is left untranslated', () => {
    expect(cleanEnglish('<the>')).toBe('the (not translated)');
  });
});

describe('lexicons', () => {
  it('keeps a Hebrew entry\'s numbered main senses', () => {
    expect(mainSenses('1) to pasture, tend<br>1a) (Qal)<br>2) to associate with', 'רָעָה')).toBe('to pasture, tend; to associate with');
  });

  it('keeps a Greek entry\'s bold senses, after its headword', () => {
    expect(mainSenses(' <b>λόγος</b>, -ου <BR />__1. <b>a word</b>; <BR />__2. <b>a saying</b>.', 'λόγος')).toBe('a word; a saying');
  });

  it('reads entries by their disambiguated number, with transliterations without dots', () => {
    const lexicon = parseLexicon('H7462b\tH7462B =\tH7462B\tרָעָה\tra.ah\tH:V\tto pasture\t1) to pasture, tend');

    expect(lexicon.get('H7462B')).toEqual({lemma: 'רָעָה', transliteration: 'raah', gloss: 'to pasture', meaning: 'to pasture, tend'});
  });

  it('writes only the entries the words use, in groups of a hundred numbers', () => {
    const entry = {lemma: 'רָעָה', transliteration: 'raah', gloss: 'to pasture', meaning: 'to pasture'};
    const files = lexiconFiles(new Map([['psalms/23', [[1, 'רֹעִי', 'ro\'i', 'my shepherd', 'H7462B', 'HVqrmsc']]]]), new Map([['H7462B', entry], ['H0001', entry]]));

    expect([...files]).toEqual([['H74', {H7462B: entry}]]);
  });
});

describe('parseGrammar', () => {
  it('describes a code in plain English, without the notes in brackets', () => {
    const grammar = parseGrammar([
      'HVqrmsc\tFunction=Verb ; Stem=Qal (hence Action=Simple; Voice=Active); Form=Participle ; Gender=Masculine; Number=Singular; State=Construct',
      'V-IAI-3S\tFunction=Verb; Tense=Imperfect; Voice=Active; Mood=Indicative; Person=3rd; Number=Singular',
    ].join('\n'));

    expect(grammar.get('HVqrmsc')).toBe('Verb, Qal, participle, masculine, singular, construct');
    expect(grammar.get('V-IAI-3S')).toBe('Verb, imperfect, active, indicative, 3rd person, singular');
    expect(grammarFile(new Map([['john/1', [[1, 'ἦν', 'ēn', 'was', 'G1510', 'V-IAI-3S']]]]), grammar)).toEqual({'V-IAI-3S': grammar.get('V-IAI-3S')});
  });
});

describe('the committed word data', () => {
  it('has a file for every chapter', () => {
    const missing = BIBLE_BOOKS.flatMap((book) => Array.from({length: book.chapters}, (_, index) => `${book.slug}/${index + 1}`))
      .filter((chapter) => !existsSync(`apps/web/public/word-data/${chapter}.json`));

    expect(missing).toEqual([]);
  });

  it('has the dictionary entry of every word in Psalm 23 and John 1', () => {
    for (const chapter of ['psalms/23', 'john/1']) {
      const file = JSON.parse(readFileSync(`apps/web/public/word-data/${chapter}.json`, 'utf8')) as WordFile;
      const missing = file.words.filter(([, , , , strongs]) => {
        const group = lexiconGroup(strongs);
        const lexicon = group ? JSON.parse(readFileSync(`apps/web/public/word-data/_lexicon/${group}.json`, 'utf8')) as LexiconFile : {};

        return !lexicon[strongs];
      });

      expect(missing).toEqual([]);
    }
  });
});

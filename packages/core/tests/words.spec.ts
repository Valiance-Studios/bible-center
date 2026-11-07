import type {WordFile} from '../src/words';

import {describe, expect, it} from 'vitest';
import {BIBLE_BOOKS, isOldTestament} from '../src/bibleBooks';
import {languageOfWords, lexiconGroup, wordsOfVerse} from '../src/words';

const ACTS_4: WordFile = {
  language: 'greek',
  words: [
    [5, 'ἐγένετο', 'egeneto', 'it came to pass', 'G1096', 'V-2ADI-3S'],
    [5, 'Ἰερουσαλήμ', 'Ierousalēm', 'in Jerusalem', 'G2419', 'N-DSF-L', null, 6],
    [6, 'θεὸς', 'theos', 'God', 'G2316', 'N-NSM-T', 'bsb'],
    [6, 'υἱός', 'huios', 'Son', 'G5207', 'N-NSM', 'kjv'],
  ],
};

describe('wordsOfVerse', () => {
  const textsOf = (translation: 'bsb' | 'kjv', verse: number) => wordsOfVerse(ACTS_4, translation, verse).map(({text}) => text);

  it('numbers words as each translation does', () => {
    expect(textsOf('bsb', 5)).toEqual(['ἐγένετο', 'Ἰερουσαλήμ']);
    expect(textsOf('kjv', 5)).toEqual(['ἐγένετο']);
  });

  it('shows only the words each translation\'s Greek has', () => {
    expect(textsOf('bsb', 6)).toEqual(['θεὸς']);
    expect(textsOf('kjv', 6)).toEqual(['Ἰερουσαλήμ', 'υἱός']);
  });
});

describe('languageOfWords', () => {
  const word = (grammar: string) => ({text: '', transliteration: '', english: '', strongs: '', grammar});

  it('tells Hebrew from Aramaic, and notices a verse with both', () => {
    expect(languageOfWords('hebrew', [word('HVqp3ms')])).toBe('Hebrew');
    expect(languageOfWords('hebrew', [word('AVqp3ms')])).toBe('Aramaic');
    expect(languageOfWords('hebrew', [word('HVqp3ms'), word('AVqp3ms')])).toBe('Hebrew and Aramaic');
    expect(languageOfWords('greek', [word('ADV')])).toBe('Greek');
  });
});

describe('lexiconGroup', () => {
  it('groups Strong\'s numbers by language and hundreds', () => {
    expect(lexiconGroup('H7462B')).toBe('H74');
    expect(lexiconGroup('G0026')).toBe('G00');
    expect(lexiconGroup('')).toBeNull();
  });
});

describe('isOldTestament', () => {
  it('is true from Genesis to Malachi', () => {
    const testaments = BIBLE_BOOKS.map(isOldTestament);

    expect(testaments.filter(Boolean)).toHaveLength(39);
    expect(isOldTestament(BIBLE_BOOKS.find(({slug}) => slug === 'malachi')!)).toBe(true);
    expect(isOldTestament(BIBLE_BOOKS.find(({slug}) => slug === 'matthew')!)).toBe(false);
  });
});

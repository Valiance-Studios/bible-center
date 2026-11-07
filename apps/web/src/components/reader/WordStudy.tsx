import type {ChapterRef, WordLanguage} from '@bible-center/core';
import type {StudyWord} from './useVerseWords';

import {useState} from 'react';
import {Button, Loader} from '@mantine/core';
import {useVerseWords} from './useVerseWords';
import classes from './WordStudy.module.scss';

/** STEPBible asks to be credited with a link to its data. */
const STEPBIBLE_DATA_URL = 'https://stepbible.github.io/STEPBible-Data/';

/** Where STEP Bible lists every use of a Strong's number. */
function strongsUrl(strongs: string): string {
  return `https://www.stepbible.org/?q=strong=${encodeURIComponent(strongs)}`;
}

/** A Strong's number as people know it, without STEPBible's letter that tells apart its senses: H7462 for H7462B. */
function plainStrongs(strongs: string): string {
  return strongs.replace(/[A-Za-z]$/, '');
}

/** The `lang` of a language's words: Hebrew, Aramaic (in Hebrew script) or Koine Greek. */
const LANG: Record<WordLanguage, string> = {'Hebrew': 'he', 'Aramaic': 'arc', 'Hebrew and Aramaic': 'he', 'Greek': 'grc'};

function WordEntry({word, language}: {word: StudyWord; language: WordLanguage}) {
  const isGreek = language === 'Greek';
  const textClass = isGreek ? classes.greek : classes.hebrew;

  return (
    <div className={classes.entry} aria-live="polite">
      <p className={`${classes.entryWord} ${textClass}`} lang={LANG[language]} dir={isGreek ? 'ltr' : 'rtl'}>{word.text}</p>
      <p className={classes.transliteration}>{word.transliteration}</p>
      <dl className={classes.facts}>
        <dt>In English</dt>
        <dd>{word.english}</dd>
        {word.entry && (
          <>
            <dt>Dictionary form</dt>
            <dd>
              <bdi className={textClass} lang={LANG[language]}>{word.entry.lemma}</bdi>
              {`, ${word.entry.transliteration}, “${word.entry.gloss}”`}
            </dd>
            <dt>Meaning</dt>
            <dd>{word.entry.meaning}</dd>
          </>
        )}
        <dt>Grammar</dt>
        <dd>{word.grammarText}</dd>
        {word.strongs && (
          <>
            <dt>Strong’s</dt>
            <dd><a href={strongsUrl(word.strongs)} target="_blank" rel="noreferrer">{plainStrongs(word.strongs)}</a></dd>
          </>
        )}
      </dl>
    </div>
  );
}

interface WordStudyProps {
  reference: ChapterRef;
  /** The verse to show, or null before one is selected. */
  verse: number | null;
  translationId: string;
}

/**
 * The selected verse's words in Hebrew, Aramaic or Greek, as the translation follows them, and the meaning
 * of the one selected. Shown beside the reader, or in a sheet on phones.
 */
export function WordStudy({reference, verse, translationId}: WordStudyProps) {
  const {language, words, isPending, isError, retry} = useVerseWords(reference, verse, translationId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = words[selectedIndex] ?? words[0];
  const isGreek = language === 'Greek';

  if (isPending) {
    return <Loader size="sm" aria-label="Loading the original words" />;
  }

  if (isError || !language) {
    return (
      <p className={classes.hint}>
        {'The original words could not be loaded. '}
        <Button variant="subtle" size="compact-sm" onClick={retry}>Try again</Button>
      </p>
    );
  }

  if (verse === null) {
    return (
      <>
        <h2 className={classes.heading}>{`${isGreek ? 'Greek' : 'Hebrew'} words`}</h2>
        <p className={classes.hint}>{`Select a verse to see its ${isGreek ? 'Greek' : 'Hebrew'} words.`}</p>
      </>
    );
  }

  return (
    <>
      <h2 className={classes.heading}>{`${language} words in verse ${verse}`}</h2>
      <p className={classes.hint}>{isGreek ? 'The Greek this translation follows. Select a word to see its meaning.' : 'Select a word to see its meaning.'}</p>

      {words.length === 0 && <p className={classes.hint}>This translation has no words here in the original text.</p>}

      <div className={`${classes.words} ${isGreek ? classes.greek : classes.hebrew}`} lang={LANG[language]} dir={isGreek ? 'ltr' : 'rtl'}>
        {words.map((word, index) => (
          <button
            // Words repeat, so their place in the verse tells them apart.
            key={index}
            type="button"
            className={word === selected ? classes.wordOn : classes.word}
            aria-pressed={word === selected}
            aria-label={`${word.text.replace(/[,.;:·]+$/, '')}, ${word.transliteration}, “${word.english}”`}
            onClick={() => setSelectedIndex(index)}
          >
            {word.text}
          </button>
        ))}
      </div>

      {selected && <WordEntry word={selected} language={language} />}

      <p className={classes.credit}>
        {`${isGreek ? 'Greek' : 'Hebrew'} data from `}
        <a href={STEPBIBLE_DATA_URL}>STEP Bible</a>
        , Tyndale House, CC BY 4.0.
      </p>
    </>
  );
}

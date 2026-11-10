import {Link, Navigate, useSearchParams} from 'react-router';
import {Alert, Button, Loader, SegmentedControl} from '@mantine/core';
import {findTranslation} from '@/bible/translations';
import {useReferenceSpan} from '@/bible/useReferenceSpan';
import {FadingWords} from '@/components/memorize/FadingWords';
import {FlashCard} from '@/components/memorize/FlashCard';
import {MemoryListBox} from '@/components/memorize/MemoryListBox';
import {useMemoryList} from '@/components/memorize/useMemoryList';
import {TranslationSelect} from '@/components/TranslationSelect';
import {memoryKeyOf} from '@/firebase/memoryVerses';
import {useTranslationStore} from '@/stores/translation';
import pageClasses from './AdminPage.module.scss';
import classes from '@/components/memorize/Memorize.module.scss';

type Mode = 'card' | 'fading';

const MODES = [
  {value: 'card', label: 'Flash card'},
  {value: 'fading', label: 'Fading words'},
];

/** Practicing one verse or passage by heart, at `/memorize/practice?passage=Psalm 23:1-2`, with a flash card or fading words. */
export function MemorizePracticePage() {
  const [params, setParams] = useSearchParams();
  const text = params.get('passage') ?? '';
  const mode: Mode = params.get('mode') === 'fading' ? 'fading' : 'card';
  const translation = findTranslation(useTranslationStore((state) => state.translationId));
  const {span, title, passage, problem} = useReferenceSpan(text, translation);
  const list = useMemoryList();
  const key = span ? memoryKeyOf(span) : null;
  const isOnList = key !== null && (list.entries?.some((entry) => entry.key === key) ?? false);
  const label = `${title}, ${translation.abbreviation}`;

  if (!text.trim()) {
    return <Navigate to="/memorize" replace />;
  }

  /** Practicing a verse on the list moves its review date on. */
  function recordPractice() {
    if (key && isOnList) {
      list.practice({key}).catch(() => {});
    }
  }

  function setMode(next: string) {
    const nextParams = new URLSearchParams(params);

    if (next === 'fading') {
      nextParams.set('mode', next);
    } else {
      nextParams.delete('mode');
    }

    setParams(nextParams, {replace: true});
  }

  return (
    <main className={pageClasses.content}>
      <title>{`Memorize ${title || 'a verse'} | Bible Center`}</title>
      <Link className={classes.back} to="/memorize">{list.canKeepList ? 'My memory list' : 'Memorize'}</Link>
      <div className={classes.head}>
        <h1 className={pageClasses.title}>{title || 'Memorize'}</h1>
        <div className={classes.translation}><TranslationSelect /></div>
      </div>

      {problem && (
        <>
          <p className={classes.problem}>{problem}</p>
          <Button component={Link} to="/memorize" variant="outline" radius="xl">Choose another verse</Button>
        </>
      )}

      {!problem && passage.isError && (
        <Alert color="red" title="The verse could not be loaded">
          <p className={pageClasses.alertText}>Check your connection and try again.</p>
          <Button onClick={passage.retry}>Try again</Button>
        </Alert>
      )}

      {!problem && !passage.isError && !span && <Loader aria-label="Loading the verse" />}

      {span && (
        <>
          <SegmentedControl
            className={classes.modes}
            radius="xl"
            size="md"
            color="lapis"
            aria-label="How to practice"
            data={MODES}
            value={mode}
            onChange={setMode}
          />

          {/* Keyed by what is shown, so changing the passage or translation starts again. */}
          {mode === 'card'
            ? <FlashCard key={`${key}-${translation.id}`} title={title} label={label} sections={passage.sections} onAnswer={recordPractice} />
            : <FadingWords key={`${key}-${translation.id}`} text={passage.text} label={label} onFinish={recordPractice} />}

          <MemoryListBox span={span} list={list} />
          <p className={classes.credit}>{translation.credit}</p>
        </>
      )}
    </main>
  );
}

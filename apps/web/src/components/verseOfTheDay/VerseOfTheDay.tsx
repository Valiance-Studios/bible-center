import {useState} from 'react';
import {Link} from 'react-router';
import {dateKeyOf, isAdmin} from '@bible-center/core';
import {Button, Skeleton} from '@mantine/core';
import {chapterPath, memorizePath, referencePath} from '@/bible/paths';
import {findTranslation} from '@/bible/translations';
import {useSpanText} from '@/bible/useSpanText';
import {useAuthStore} from '@/stores/auth';
import {useTranslationStore} from '@/stores/translation';
import {useVerseOfTheDay} from './dailyVerseQueries';
import {SetVerseDialog} from './SetVerseDialog';
import classes from './VerseOfTheDay.module.scss';

/** The home page's verse for the viewer's date, in their translation, which admins can set. */
export function VerseOfTheDay() {
  // The viewer's own date, fixed while the page is open.
  const [date] = useState(() => dateKeyOf(new Date()));
  const translation = findTranslation(useTranslationStore((state) => state.translationId));
  const today = useVerseOfTheDay(date);
  const {reference, label, passage} = useSpanText(today.verse, translation);
  const adminUid = useAuthStore((state) => (state.status === 'allowed' && isAdmin(state.role) ? state.user?.uid : undefined));
  const [isSetting, setIsSetting] = useState(false);
  const isError = today.isError || passage.isError;

  return (
    <section aria-labelledby="verse-of-the-day">
      <p id="verse-of-the-day" className={classes.label}>Verse of the day</p>

      {isError && (
        <div className={classes.error}>
          <p>The verse of the day could not be loaded. Check your connection and try again.</p>
          <Button onClick={() => {
            today.retry();
            passage.retry();
          }}
          >
            Try again
          </Button>
        </div>
      )}

      {!isError && (!reference || passage.isPending) && (
        <div className={classes.loading} aria-busy="true" aria-label="Loading the verse of the day">
          <Skeleton height="1em" mb="0.2em" />
          <Skeleton height="1em" mb="0.2em" />
          <Skeleton height="1em" width="60%" />
        </div>
      )}

      {!isError && reference && !passage.isPending && (
        <>
          <blockquote className={classes.verse}>{passage.text}</blockquote>
          <div className={classes.foot}>
            <Link className={classes.reference} to={referencePath(reference)}>{label}</Link>
            <Link className={classes.quiet} to={chapterPath({book: reference.book, chapter: reference.startChapter})}>Read the chapter</Link>
            <Link className={classes.quiet} to={memorizePath(reference)}>Memorize</Link>
            {adminUid && (
              <button type="button" className={classes.quiet} onClick={() => setIsSetting(true)}>Set verse of the day</button>
            )}
          </div>
        </>
      )}

      {isSetting && adminUid && (
        <SetVerseDialog uid={adminUid} initialDate={date} translation={translation} onClose={() => setIsSetting(false)} />
      )}
    </section>
  );
}

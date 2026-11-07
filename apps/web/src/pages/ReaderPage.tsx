import type {ChapterRef} from '@bible-center/core';

import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link, Navigate, useLocation, useNavigate, useParams} from 'react-router';
import {BIBLE_BOOKS, chapterTitle, nextChapter, parseChapterRef, previousChapter} from '@bible-center/core';
import {Alert, Button, Loader, NativeSelect} from '@mantine/core';
import {chapterPath} from '@/bible/paths';
import {chapterQuery} from '@/bible/queries';
import {findTranslation} from '@/bible/translations';
import {ChapterVerses} from '@/components/reader/ChapterVerses';
import {TranslationSelect} from '@/components/TranslationSelect';
import {useTranslationStore} from '@/stores/translation';
import classes from './ReaderPage.module.scss';

function ChapterLink({target, label, path}: {target: ChapterRef | null; label: string; path: string}) {
  const icon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;

  // Kept in place at either end of the Bible, so the other button does not move.
  return target
    ? <Link className={classes.chapterNav} to={chapterPath(target)} aria-label={`${label}: ${chapterTitle(target)}`}>{icon}</Link>
    : <span className={classes.chapterNavEnd} aria-hidden="true">{icon}</span>;
}

function Chapter({reference}: {reference: ChapterRef}) {
  const navigate = useNavigate();
  const {hash} = useLocation();
  const translationId = useTranslationStore((state) => state.translationId);
  const translation = findTranslation(translationId);
  const {book, chapter} = reference;
  const title = chapterTitle(reference);
  const {data, isPending, isError, refetch} = useQuery(chapterQuery(translation, reference));
  const hasText = data !== undefined;

  // A link to a verse, as from search results. The text loads after navigation, so scroll once it is there.
  useEffect(() => {
    if (hasText && hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({block: 'center'});
    }
  }, [hasText, hash]);

  return (
    <main className={classes.reading}>
      <title>{`${title} | Bible Center`}</title>

      <div className={classes.controls}>
        <NativeSelect
          size="md"
          aria-label="Book"
          value={book.slug}
          data={BIBLE_BOOKS.map(({name, slug}) => ({label: name, value: slug}))}
          onChange={(event) => void navigate(`/read/${event.currentTarget.value}/1`)}
        />
        <NativeSelect
          size="md"
          aria-label="Chapter"
          value={String(chapter)}
          data={Array.from({length: book.chapters}, (_, index) => String(index + 1))}
          onChange={(event) => void navigate(`/read/${book.slug}/${event.currentTarget.value}`)}
        />
        <TranslationSelect />
        <div className={classes.chapterArrows}>
          <ChapterLink target={previousChapter(reference)} label="Previous chapter" path="M15 5l-7 7 7 7" />
          <ChapterLink target={nextChapter(reference)} label="Next chapter" path="M9 5l7 7-7 7" />
        </div>
      </div>

      <h1 className={classes.title}>{title}</h1>

      {isPending && <Loader aria-label="Loading" />}

      {isError && (
        <Alert color="red" title={`Could not load ${title}`}>
          <p className={classes.errorText}>Check your connection and try again.</p>
          <Button onClick={() => void refetch()}>Try again</Button>
        </Alert>
      )}

      {data && (
        <>
          {/* Keyed by chapter so a selection does not carry over to the next one. */}
          <ChapterVerses
            key={`${book.slug}-${chapter}`}
            reference={reference}
            verses={data.verses}
            targetVerse={hash.startsWith('#v') ? Number(hash.slice(2)) : null}
          />
          <p className={classes.credit}>{translation.credit}</p>
        </>
      )}
    </main>
  );
}

export function ReaderPage() {
  const {book, chapter} = useParams();
  const reference = parseChapterRef(book, chapter);

  return reference ? <Chapter reference={reference} /> : <Navigate to="/read" replace />;
}

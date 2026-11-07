import type {ChapterRef} from '@bible-center/core';

import {useQuery} from '@tanstack/react-query';
import {Link, Navigate, useNavigate, useParams} from 'react-router';
import {BIBLE_BOOKS, chapterTitle, nextChapter, parseChapterRef, previousChapter} from '@bible-center/core';
import {Alert, Button, Loader, NativeSelect} from '@mantine/core';
import {chapterPath} from '@/bible/paths';
import {findTranslation, TRANSLATIONS} from '@/bible/translations';
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
  const translationId = useTranslationStore((state) => state.translationId);
  const setTranslationId = useTranslationStore((state) => state.setTranslationId);
  const translation = findTranslation(translationId);
  const {book, chapter} = reference;
  const title = chapterTitle(reference);
  const {data, isPending, isError, refetch} = useQuery({
    queryKey: ['chapter', translation.id, book.slug, chapter],
    queryFn: () => translation.getChapter(reference),
  });

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
        <NativeSelect
          size="md"
          aria-label="Translation"
          value={translation.id}
          data={TRANSLATIONS.map(({id, name}) => ({label: name, value: id}))}
          onChange={(event) => setTranslationId(event.currentTarget.value)}
        />
        <ChapterLink target={previousChapter(reference)} label="Previous chapter" path="M15 5l-7 7 7 7" />
        <ChapterLink target={nextChapter(reference)} label="Next chapter" path="M9 5l7 7-7 7" />
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
          {data.verses.map(({verse, text}) => (
            <p key={verse} className={classes.verse}>
              <sup className={classes.verseNumber}>{verse}</sup>
              {text}
            </p>
          ))}
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

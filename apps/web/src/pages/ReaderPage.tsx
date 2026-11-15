import type {ChapterRef, VerseSpan} from '@bible-center/core';

import {useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link, Navigate, useLocation, useNavigate, useParams} from 'react-router';
import {BIBLE_BOOKS, chapterTitle, isOldTestament, nextChapter, parseChapterRef, previousChapter} from '@bible-center/core';
import {Alert, Button, Drawer, Loader, NativeSelect} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {ArrowIcon} from '@/components/ArrowIcon';
import {chapterPath} from '@/bible/paths';
import {chapterQuery} from '@/bible/queries';
import {findTranslation} from '@/bible/translations';
import {ChapterVerses} from '@/components/reader/ChapterVerses';
import {WordStudy} from '@/components/reader/WordStudy';
import {TranslationSelect} from '@/components/TranslationSelect';
import {useTranslationStore} from '@/stores/translation';
import classes from './ReaderPage.module.scss';

function ChapterLink({target, label, direction}: {target: ChapterRef | null; label: string; direction: 'previous' | 'next'}) {
  const icon = <ArrowIcon direction={direction} />;

  // Kept in place at either end of the Bible, so the other button does not move.
  return target
    ? <Link className={classes.chapterNav} to={chapterPath(target)} aria-label={`${label}: ${chapterTitle(target)}`}>{icon}</Link>
    : <span className={classes.chapterNavEnd} aria-hidden="true">{icon}</span>;
}

/** Below this width the word panel moves from beside the text into a sheet, opened from a verse's tools. */
const PHONE_QUERY = '(max-width: 900px)';

/** The verses whose words the panel shows, and the one of them it is on. */
interface Study {
  span: VerseSpan;
  verse: number;
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
  const isPhone = useMediaQuery(PHONE_QUERY, false, {getInitialValueInEffect: false});
  const [selection, setSelection] = useState<VerseSpan | null>(null);
  /** Follows the selection, starting on its first verse, and empties once the reader deselects. */
  const [study, setStudy] = useState<Study | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const wordsLabel = isOldTestament(book) ? 'Hebrew words' : 'Greek words';
  const isStudyingRange = study !== null && study.span.start !== study.span.end;
  const wordStudy = (
    <WordStudy
      key={study?.verse}
      reference={reference}
      verse={study?.verse ?? null}
      translationId={translationId}
      steps={study && isStudyingRange
        ? {
            position: study.verse - study.span.start + 1,
            count: study.span.end - study.span.start + 1,
            onStep: (by) => setStudy({...study, verse: study.verse + by}),
          }
        : undefined}
    />
  );

  // A link to a verse, as from search results. The text loads after navigation, so scroll once it is there.
  useEffect(() => {
    if (hasText && hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({block: 'center'});
    }
  }, [hasText, hash]);

  return (
    <div className={classes.layout}>
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
            <ChapterLink target={previousChapter(reference)} label="Previous chapter" direction="previous" />
            <ChapterLink target={nextChapter(reference)} label="Next chapter" direction="next" />
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
            <ChapterVerses
              reference={reference}
              verses={data.verses}
              targetVerse={hash.startsWith('#v') ? Number(hash.slice(2)) : null}
              selection={selection}
              studiedVerse={isStudyingRange ? study.verse : null}
              onSelectionChange={(next, {keepWords = false} = {}) => {
                setSelection(next);

                if (!keepWords) {
                  setStudy(next && {span: next, verse: next.start});
                }
              }}
              wordsTool={isPhone ? {label: wordsLabel, onClick: () => setIsSheetOpen(true)} : undefined}
            />
            <p className={classes.credit}>{translation.credit}</p>
          </>
        )}
      </main>

      {isPhone
        ? (
            <Drawer opened={isSheetOpen} onClose={() => setIsSheetOpen(false)} position="bottom" size="auto" title={wordsLabel} classNames={{body: classes.sheet, title: classes.sheetTitle}}>
              {wordStudy}
            </Drawer>
          )
        : <aside className={classes.study} aria-label={wordsLabel}>{wordStudy}</aside>}
    </div>
  );
}

export function ReaderPage() {
  const {book, chapter} = useParams();
  const reference = parseChapterRef(book, chapter);

  // Keyed by chapter so a selection does not carry over to the next one.
  return reference ? <Chapter key={`${reference.book.slug}-${reference.chapter}`} reference={reference} /> : <Navigate to="/read" replace />;
}

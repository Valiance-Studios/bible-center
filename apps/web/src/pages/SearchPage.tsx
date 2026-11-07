import type {VerseReference} from '@bible-center/core';
import type {TranslationProvider} from '@/bible/translations';

import {useQueries, useQuery} from '@tanstack/react-query';
import {Link, useSearchParams} from 'react-router';
import {BIBLE_BOOKS, chapterTitle, formatReference, parseReferences} from '@bible-center/core';
import {Alert, Button, Loader} from '@mantine/core';
import {highlightWords} from '@/bible/highlight';
import {chapterPath} from '@/bible/paths';
import {chapterQuery, phraseIndexQuery} from '@/bible/queries';
import {findTranslation, TRANSLATIONS} from '@/bible/translations';
import {SearchBox} from '@/components/SearchBox';
import {TranslationSelect} from '@/components/TranslationSelect';
import {VerseText} from '@/components/VerseText';
import {useTranslationStore} from '@/stores/translation';
import classes from './SearchPage.module.scss';

function LoadFailed({onRetry}: {onRetry: () => void}) {
  return (
    <Alert color="red" title="Could not load these results">
      <p className={classes.alertText}>Check your connection and try again.</p>
      <Button onClick={onRetry}>Try again</Button>
    </Alert>
  );
}

function Passage({reference, translation}: {reference: VerseReference; translation: TranslationProvider}) {
  const {book, startChapter, startVerse, endChapter, endVerse} = reference;
  const chapters = Array.from({length: endChapter - startChapter + 1}, (_, index) => startChapter + index);
  const results = useQueries({queries: chapters.map((chapter) => chapterQuery(translation, {book, chapter}))});
  const isSpanningChapters = chapters.length > 1;
  const sections = chapters.map((chapter, index) => ({
    chapter,
    verses: (results[index]?.data?.verses ?? []).filter(({verse}) => {
      const isAfterStart = chapter !== startChapter || startVerse === null || verse >= startVerse;
      const isBeforeEnd = chapter !== endChapter || endVerse === null || verse <= endVerse;

      return isAfterStart && isBeforeEnd;
    }),
  }));
  const isPending = results.some((result) => result.isPending);
  const failed = results.filter((result) => result.isError);
  const first = {book, chapter: startChapter};

  return (
    <article className={classes.passage}>
      <h2 className={classes.passageTitle}>{formatReference(reference)}</h2>

      {isPending && <Loader aria-label="Loading" />}
      {failed.length > 0 && <LoadFailed onRetry={() => failed.forEach((result) => void result.refetch())} />}

      {!isPending && failed.length === 0 && sections.every(({verses}) => verses.length === 0) && (
        <p className={classes.notFound}>{`${translation.name} has no verses at this reference.`}</p>
      )}

      {sections.filter(({verses}) => verses.length > 0).map(({chapter, verses}) => (
        <section key={chapter}>
          {isSpanningChapters && <h3 className={classes.chapterHeading}>{chapterTitle({book, chapter})}</h3>}
          {verses.map(({verse, text}) => <VerseText key={verse} verse={verse} text={text} />)}
        </section>
      ))}

      <Link className={classes.context} to={chapterPath(first)}>{`Read ${chapterTitle(first)}`}</Link>
    </article>
  );
}

function ReferenceResults({references, translation}: {references: VerseReference[]; translation: TranslationProvider}) {
  const count = references.length;

  return (
    <>
      <div className={classes.summaryRow}>
        <p className={classes.summary}>{count === 1 ? '1 passage' : `${count} passages`}</p>
        <TranslationSelect />
      </div>
      {references.map((reference, index) => (
        // The same passage can be listed twice, so its position is part of its identity.
        <Passage key={`${index}-${formatReference(reference)}`} reference={reference} translation={translation} />
      ))}
      <p className={classes.credit}>{translation.credit}</p>
    </>
  );
}

function NoMatches({query, translation}: {query: string; translation: TranslationProvider}) {
  const setTranslationId = useTranslationStore((state) => state.setTranslationId);
  const others = TRANSLATIONS.filter(({id}) => id !== translation.id);

  return (
    <>
      <h1 className={classes.emptyTitle}>{`No verses match “${query}”`}</h1>
      <p className={classes.emptyBody}>{`This searched the ${translation.name}. To find what you are looking for:`}</p>
      <ul className={classes.emptyList}>
        <li>Check the spelling, or use fewer words.</li>
        <li>Search by reference, such as John 3:16.</li>
        <li>Try a different translation, since the wording varies.</li>
      </ul>
      {others.map(({id, name}) => (
        <Button key={id} variant="outline" radius="xl" onClick={() => setTranslationId(id)}>{`Search the ${name}`}</Button>
      ))}
    </>
  );
}

function PhraseResults({query, translation}: {query: string; translation: TranslationProvider}) {
  const {data: index, isPending, isError, refetch} = useQuery(phraseIndexQuery(translation));

  if (isPending) {
    return <Loader className={classes.loader} aria-label="Searching" />;
  }

  if (isError) {
    return <LoadFailed onRetry={() => void refetch()} />;
  }

  const matches = index.search(query);

  if (matches.length === 0) {
    return <NoMatches query={query} translation={translation} />;
  }

  const summary = matches[0]?.isExact ? 'Exact wording first, then the closest matches' : 'Closest matches, best first';

  return (
    <>
      <div className={classes.summaryRow}>
        <p className={classes.summary}>{summary}</p>
        <TranslationSelect />
      </div>
      {matches.map(({slug, chapter, verse, text, matchedWords}) => {
        const book = BIBLE_BOOKS.find((candidate) => candidate.slug === slug);

        // Every slug in the search file comes from BIBLE_BOOKS.
        if (!book) {
          return null;
        }

        return (
          <article key={`${slug}-${chapter}-${verse}`} className={classes.result}>
            <Link className={classes.reference} to={`${chapterPath({book, chapter})}#v${verse}`}>
              {formatReference({book, startChapter: chapter, startVerse: verse, endChapter: chapter, endVerse: verse})}
            </Link>
            <p className={classes.resultText}>
              {highlightWords(text, matchedWords).map((part, partIndex) => part.isMatch
                ? <mark key={partIndex} className={classes.hit}>{part.text}</mark>
                : part.text)}
            </p>
          </article>
        );
      })}
      <p className={classes.credit}>{translation.credit}</p>
    </>
  );
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const translationId = useTranslationStore((state) => state.translationId);
  const translation = findTranslation(translationId);
  const query = searchParams.get('q')?.trim() ?? '';
  const references = query ? parseReferences(query) : null;

  return (
    <main className={classes.content}>
      <title>{query ? `${query} | Bible Center` : 'Search | Bible Center'}</title>

      {/* The key resets the box when the search changes from outside it, as with the back button. */}
      <SearchBox key={query} initialQuery={query} placeholder="John 1:1-5, “mercies never fail”, or marriage" />

      {!query && <p className={classes.prompt}>Search by reference, such as John 1:1-5, or by words you remember from a verse.</p>}
      {references && <ReferenceResults references={references} translation={translation} />}
      {query && !references && <PhraseResults query={query} translation={translation} />}
    </main>
  );
}

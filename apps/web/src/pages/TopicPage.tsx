import type {TopicVerse, VerseReference} from '@bible-center/core';
import type {TranslationProvider} from '@/bible/translations';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link, useParams} from 'react-router';
import {formatReference, rankTopicVerses, referenceOf} from '@bible-center/core';
import {Alert, Button, Loader} from '@mantine/core';
import {chapterPath} from '@/bible/paths';
import {findTranslation} from '@/bible/translations';
import {usePassage} from '@/bible/usePassage';
import {useTranslationStore} from '@/stores/translation';
import {nameFromSlug, topicQuery} from '@/topics/topicData';
import classes from './TopicPage.module.scss';

const PAGE_SIZE = 20;
const NO_UPVOTES = new Map<string, number>();
const OPENBIBLE_TOPICS_URL = 'https://www.openbible.info/topics/';

interface TopicVerseRowProps {
  verse: TopicVerse;
  reference: VerseReference;
  translation: TranslationProvider;
}

function TopicVerseRow({verse, reference, translation}: TopicVerseRowProps) {
  const {text, isPending, isError, retry} = usePassage(reference, translation);
  const title = formatReference(reference);
  const chapter = {book: reference.book, chapter: reference.startChapter};

  return (
    <article className={classes.row}>
      <Link className={classes.reference} to={`${chapterPath(chapter)}#v${reference.startVerse ?? 1}`}>{title}</Link>

      {isPending && <Loader size="sm" mt={8} aria-label={`Loading ${title}`} />}

      {isError && (
        <p className={classes.missing}>
          {'The text could not be loaded. '}
          <Button variant="subtle" size="compact-sm" onClick={retry}>Try again</Button>
        </p>
      )}

      {!isPending && !isError && (text
        ? <p className={classes.text}>{text}</p>
        : <p className={classes.missing}>{`The ${translation.name} has no verses at this reference.`}</p>)}

      <p className={classes.meta}>{`${verse.openBibleVotes.toLocaleString('en-US')} on OpenBible`}</p>
    </article>
  );
}

function Topic({slug}: {slug: string}) {
  const translation = findTranslation(useTranslationStore((state) => state.translationId));
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const {data: topic, isPending, isError, refetch} = useQuery(topicQuery(slug));
  const name = topic?.name ?? nameFromSlug(slug);
  // The data script keeps only verse ids that exist, so this drops nothing in practice.
  const verses = (topic ? rankTopicVerses(topic.verses, NO_UPVOTES) : []).flatMap((verse) => {
    const reference = referenceOf(verse);

    return reference ? [{verse, reference}] : [];
  });

  return (
    <main className={classes.content}>
      <title>{`What the Bible says about ${name} | Bible Center`}</title>
      <p className={classes.ask}>What does the Bible say about</p>
      <h1 className={classes.title}>{name}</h1>

      {isPending && <Loader aria-label="Loading" />}

      {isError && (
        <Alert color="red" title="Could not load this topic">
          <p className={classes.alertText}>Check your connection and try again.</p>
          <Button onClick={() => void refetch()}>Try again</Button>
        </Alert>
      )}

      {!isPending && !isError && verses.length === 0 && (
        <>
          <p className={classes.notice}>No one has added a verse to this topic yet.</p>
          <Link className={classes.more} to="/topics">Browse all topics</Link>
        </>
      )}

      {verses.length > 0 && (
        <>
          <p className={classes.intro}>
            {'Ranked by people on Bible Center, starting from the votes on '}
            <a href={OPENBIBLE_TOPICS_URL}>OpenBible.info</a>
            .
          </p>

          {verses.slice(0, shownCount).map(({verse, reference}) => (
            <TopicVerseRow key={`${verse.startVerse}-${verse.endVerse}`} verse={verse} reference={reference} translation={translation} />
          ))}

          {verses.length > shownCount && (
            <Button className={classes.showMore} variant="outline" radius="xl" size="md" onClick={() => setShownCount(shownCount + PAGE_SIZE)}>
              Show more
            </Button>
          )}

          <p className={classes.credit}>
            {'Topic votes from '}
            <a href={OPENBIBLE_TOPICS_URL}>OpenBible.info</a>
            {`, licensed CC BY. Scripture from the ${translation.credit}`}
          </p>
        </>
      )}
    </main>
  );
}

/** "What does the Bible say about ___?": a topic's verses, ranked. */
export function TopicPage() {
  const {slug = ''} = useParams();

  // A new topic starts again from its first page of verses.
  return <Topic key={slug} slug={slug} />;
}

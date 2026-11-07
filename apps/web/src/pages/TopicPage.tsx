import type {ReportReason, TopicVerse, VerseReference} from '@bible-center/core';
import type {TranslationProvider} from '@/bible/translations';

import {useEffect, useRef, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link, Navigate, useParams} from 'react-router';
import {formatReference, rankTopicVerses, referenceOf, topicSlug, topicVerseKey} from '@bible-center/core';
import {Alert, Button, Loader} from '@mantine/core';
import {referencePath} from '@/bible/paths';
import {findTranslation} from '@/bible/translations';
import {usePassage} from '@/bible/usePassage';
import {AddVerseDialog} from '@/components/topics/AddVerseDialog';
import {ReportDialog} from '@/components/topics/ReportDialog';
import {startedTopicQuery} from '@/components/topics/startedTopicQuery';
import {useTopicVotes} from '@/components/topics/useTopicVotes';
import {reportVerse} from '@/firebase/topics';
import {useAuthStore} from '@/stores/auth';
import {useTranslationStore} from '@/stores/translation';
import {nameFromSlug, topicQuery} from '@/topics/topicData';
import classes from './TopicPage.module.scss';

const PAGE_SIZE = 20;
const OPENBIBLE_TOPICS_URL = 'https://www.openbible.info/topics/';

function UpArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 15l7-7 7 7" />
    </svg>
  );
}

interface VoteButtonProps {
  title: string;
  upvotes: number;
  /** Signed in and allowed to vote. Anyone else is sent to sign in. */
  canVote: boolean;
  hasVoted: boolean;
  isSaving: boolean;
  onToggle: () => void;
}

function VoteButton({title, upvotes, canVote, hasVoted, isSaving, onToggle}: VoteButtonProps) {
  if (!canVote) {
    return (
      <Link className={classes.vote} to="/sign-in" aria-label={`Sign in to upvote ${title}`}>
        <UpArrow />
        <span>{upvotes}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={hasVoted ? classes.voteOn : classes.vote}
      aria-pressed={hasVoted}
      aria-label={hasVoted ? `Remove your upvote from ${title}` : `Upvote ${title}`}
      disabled={isSaving}
      onClick={onToggle}
    >
      <UpArrow />
      <span>{upvotes}</span>
    </button>
  );
}

/** The id of a verse's row, for scrolling to one just added. */
function rowIdOf(key: string): string {
  return `topic-verse-${key}`;
}

interface TopicVerseRowProps {
  verseKey: string;
  verse: TopicVerse;
  reference: VerseReference;
  translation: TranslationProvider;
  canVote: boolean;
  hasVoted: boolean;
  isSaving: boolean;
  isReported: boolean;
  onToggleVote: () => void;
  onReport: () => void;
}

function TopicVerseRow({verseKey, verse, reference, translation, canVote, hasVoted, isSaving, isReported, onToggleVote, onReport}: TopicVerseRowProps) {
  const {text, isPending, isError, retry} = usePassage(reference, translation);
  const title = formatReference(reference);
  const counts = [`${verse.upvotes.toLocaleString('en-US')} on Bible Center`];

  if (verse.openBibleVotes > 0) {
    counts.push(`${verse.openBibleVotes.toLocaleString('en-US')} on OpenBible`);
  }

  return (
    <article id={rowIdOf(verseKey)} className={classes.row}>
      <VoteButton title={title} upvotes={verse.upvotes} canVote={canVote} hasVoted={hasVoted} isSaving={isSaving} onToggle={onToggleVote} />
      <div className={classes.body}>
        <Link className={classes.reference} to={referencePath(reference)}>{title}</Link>

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

        <div className={classes.meta}>
          <span>{counts.join(', ')}</span>
          {canVote && (isReported
            ? <span className={classes.reported}>Reported</span>
            : <button type="button" className={classes.report} aria-label={`Report ${title}`} onClick={onReport}>Report</button>)}
        </div>
      </div>
    </article>
  );
}

interface ReportTarget {
  key: string;
  title: string;
}

function Topic({slug}: {slug: string}) {
  const translation = findTranslation(useTranslationStore((state) => state.translationId));
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const canVote = status === 'allowed' && user !== null;
  const uid = canVote ? user.uid : undefined;
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const [addedKey, setAddedKey] = useState<string | null>(null);
  /** A verse to scroll to once it appears, after it is added. */
  const scrollToKey = useRef<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportedKeys, setReportedKeys] = useState<ReadonlySet<string>>(new Set());
  const openBible = useQuery(topicQuery(slug));
  const isOpenBibleTopic = openBible.data !== null && openBible.data !== undefined;
  // A topic OpenBible does not have may be one someone started, which names it.
  const started = useQuery({...startedTopicQuery(slug), enabled: openBible.data === null});
  const votes = useTopicVotes(slug, uid);
  const name = openBible.data?.name ?? started.data?.name ?? nameFromSlug(slug);
  const isRejected = started.data?.status === 'rejected';
  const verses = rankTopicVerses(openBible.data?.verses ?? [], votes.community, votes.removedKeys).flatMap((verse) => {
    // The data script and the security rules keep only well-formed verse ids, so this drops nothing in practice.
    const reference = referenceOf(verse);

    return reference ? [{verse, reference, key: topicVerseKey(verse.startVerse, verse.endVerse)}] : [];
  });
  // A verse just added starts low, so the list grows to include it rather than leaving it out of sight.
  const addedIndex = addedKey ? verses.findIndex(({key}) => key === addedKey) : -1;
  const visibleCount = Math.max(shownCount, addedIndex + 1);
  const isPending = openBible.isPending || votes.isLoading || (openBible.data === null && started.isPending);
  // Starting a topic happens with its first verse, unless OpenBible or someone else already has it.
  const startTopicName = !isOpenBibleTopic && started.data === null ? name : undefined;

  // Once, when the added verse first appears.
  useEffect(() => {
    const row = scrollToKey.current ? document.getElementById(rowIdOf(scrollToKey.current)) : null;

    if (row) {
      row.scrollIntoView({block: 'center'});
      scrollToKey.current = null;
    }
  });

  function toggleVote(verse: TopicVerse, key: string) {
    void (votes.myVotes.has(key) ? votes.removeUpvote(key) : votes.upvote(verse)).catch(() => {
      // hasSaveError shows the failure.
    });
  }

  async function sendReport(reason: ReportReason, details: string) {
    if (!uid || !reportTarget) {
      return;
    }

    await reportVerse(uid, {topic: slug, verseKey: reportTarget.key, reason, ...(details ? {details} : {})});
    setReportedKeys(new Set([...reportedKeys, reportTarget.key]));
  }

  if (isRejected) {
    return (
      <main className={classes.content}>
        <title>Topic not available | Bible Center</title>
        <h1 className={classes.title}>{name}</h1>
        <p className={classes.notice}>This topic is not available.</p>
        <p><Link className={classes.more} to="/topics">Browse all topics</Link></p>
      </main>
    );
  }

  const addButton = canVote && !isPending && !openBible.isError && (
    <Button className={classes.add} variant="outline" radius="xl" size="md" onClick={() => setIsAdding(true)}>Add a verse to this topic</Button>
  );

  return (
    <main className={classes.content}>
      <title>{`What the Bible says about ${name} | Bible Center`}</title>
      <p className={classes.ask}>What does the Bible say about</p>
      <h1 className={classes.title}>{name}</h1>

      {status === 'signedOut' && (
        <p className={classes.signInHint}>
          <Link to="/sign-in">Sign in</Link>
          {' to upvote, add a verse or report one.'}
        </p>
      )}

      {isPending && <Loader aria-label="Loading" />}

      {openBible.isError && (
        <Alert color="red" title="Could not load this topic">
          <p className={classes.alertText}>Check your connection and try again.</p>
          <Button onClick={() => void openBible.refetch()}>Try again</Button>
        </Alert>
      )}

      {/* Without this, a failed load would look like nobody having voted. */}
      {votes.hasLoadError && <Alert color="red" mb="md">Bible Center's votes could not be loaded. Check your connection and refresh the page.</Alert>}
      {votes.hasSaveError && <Alert color="red" mb="md">Your vote could not be saved. Check your connection and try again.</Alert>}

      {!isPending && !openBible.isError && verses.length === 0 && (
        <>
          <p className={classes.notice}>
            {canVote
              ? 'No one has added a verse to this topic yet. Add one that speaks to it, and others can upvote it.'
              : 'No one has added a verse to this topic yet.'}
          </p>
          {addButton}
          <p><Link className={classes.more} to="/topics">Browse all topics</Link></p>
        </>
      )}

      {!isPending && verses.length > 0 && (
        <>
          <p className={classes.intro}>
            {'Ranked by people on Bible Center, starting from the votes on '}
            <a href={OPENBIBLE_TOPICS_URL}>OpenBible.info</a>
            . Upvote the verses that speak to this topic.
          </p>
          {addButton}

          {verses.slice(0, visibleCount).map(({verse, reference, key}) => (
            <TopicVerseRow
              key={key}
              verseKey={key}
              verse={verse}
              reference={reference}
              translation={translation}
              canVote={canVote}
              hasVoted={votes.myVotes.has(key)}
              isSaving={votes.savingKey === key}
              isReported={reportedKeys.has(key)}
              onToggleVote={() => toggleVote(verse, key)}
              onReport={() => setReportTarget({key, title: formatReference(reference)})}
            />
          ))}

          {verses.length > visibleCount && (
            <Button className={classes.showMore} variant="outline" radius="xl" size="md" onClick={() => setShownCount(visibleCount + PAGE_SIZE)}>
              Show more
            </Button>
          )}

          <p className={classes.credit}>
            {'Topic votes from '}
            <a href={OPENBIBLE_TOPICS_URL}>OpenBible.info</a>
            {`, licensed CC BY, and from people on Bible Center. Scripture from the ${translation.credit}`}
          </p>
        </>
      )}

      {isAdding && (
        <AddVerseDialog
          topicName={name}
          existingKeys={new Set(verses.map(({key}) => key))}
          removedKeys={votes.removedKeys}
          translation={translation}
          isSaving={votes.savingKey !== undefined}
          onAdd={async (span) => {
            await votes.upvote(span, startTopicName);
            const key = topicVerseKey(span.startVerse, span.endVerse);

            scrollToKey.current = key;
            setAddedKey(key);
          }}
          onClose={() => setIsAdding(false)}
        />
      )}

      {reportTarget && (
        <ReportDialog
          title={`Report ${reportTarget.title} on ${name}`}
          onSend={sendReport}
          onClose={() => setReportTarget(null)}
        />
      )}
    </main>
  );
}

/** "What does the Bible say about ___?": a topic's verses, ranked. */
export function TopicPage() {
  const {slug = ''} = useParams();
  const canonical = topicSlug(slug);

  // An address typed by hand, such as /topics/Self%20Control, goes to the topic's own address.
  if (canonical !== slug) {
    return <Navigate to={canonical ? `/topics/${canonical}` : '/topics'} replace />;
  }

  // A new topic starts again from its first page of verses.
  return <Topic key={slug} slug={slug} />;
}
